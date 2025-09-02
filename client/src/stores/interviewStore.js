import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useInterviewStore = create((set, get) => ({
  // State
  currentSession: null,
  sessions: [],
  messages: [],
  isConnected: false,
  loading: false,
  websocket: null,
  connectionError: null,
  isConnecting: false, // Add flag to prevent multiple connections
  
  // Create a new interview session
  createSession: async (agentType = 'visa_assistant') => {
    set({ loading: true });
    try {
      const response = await axios.post('/interview/start', {
        agent_type: agentType
      });
      
      const session = response.data;
      
      // Mark this as a newly created session for timing purposes
      session._isNewlyCreated = true;
      
      set({ 
        currentSession: session,
        loading: false,
        messages: []
      });
      
      toast.success('Interview session created!');
      return session;
    } catch (error) {
      set({ loading: false });
      const message = error.response?.data?.detail || 'Failed to create interview session';
      toast.error(message);
      throw error;
    }
  },

  // Get all user's interview sessions
  fetchSessions: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/interview/sessions');
      set({ sessions: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      toast.error('Failed to load interview sessions');
      throw error;
    }
  },

  // Get a specific interview session
  fetchSession: async (sessionId) => {
    set({ loading: true });
    try {
      const response = await axios.get(`/interview/sessions/${sessionId}`);
      const session = response.data;
      
      // Extract messages from session
      const messages = session.messages || [];
      
      // Mark as existing session (not newly created)
      session._isNewlyCreated = false;
      
      set({ 
        currentSession: session,
        messages: messages,
        loading: false 
      });
      
      return session;
    } catch (error) {
      set({ loading: false });
      toast.error('Failed to load interview session');
      throw error;
    }
  },

  // WebSocket connection management with retry logic
  connectWebSocket: async (sessionId, retryCount = 0, maxRetries = 3, isNewSession = false) => {
    const state = get();
    
    // Prevent multiple simultaneous connection attempts
    if (state.isConnecting) {
      console.log('Connection already in progress, skipping...');
      return;
    }
    
    console.log(`Attempting to connect to WebSocket for session ${sessionId} (attempt ${retryCount + 1}/${maxRetries}, isNew: ${isNewSession})`);
    
    // Set connecting flag
    set({ isConnecting: true });
    
    // Clear any existing connection
    get().disconnectWebSocket();
    
    try {
      // Add delay for newly created sessions to allow DB commit
      if (isNewSession && retryCount === 0) {
        console.log('New session detected, adding delay before WebSocket connection...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
      }
      
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const fullWsUrl = `${wsUrl}/interview/ws/${sessionId}`;
      
      console.log('WebSocket URL:', fullWsUrl);
      
      const ws = new WebSocket(fullWsUrl);
      
      ws.onopen = (event) => {
        console.log('✅ WebSocket connected successfully', event);
        set({ 
          isConnected: true, 
          websocket: ws, 
          connectionError: null,
          isConnecting: false // Clear connecting flag
        });
        toast.success('Connected to interview session');
      };
      
      ws.onmessage = (event) => {
        console.log('📥 WebSocket message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('📝 Parsed message:', message);
          get().handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event);
        console.log('Close code:', event.code, 'Close reason:', event.reason);
        
        set({ 
          isConnected: false, 
          websocket: null,
          isConnecting: false // Clear connecting flag
        });
        
        // Handle specific error codes with retry logic
        if (event.code === 4004 && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`🔄 Session not found, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
          
          toast(`Session not ready, retrying in ${delay/1000}s...`, {
            duration: delay - 100,
            icon: '🔄'
          });
          
          setTimeout(() => {
            get().connectWebSocket(sessionId, retryCount + 1, maxRetries, false);
          }, delay);
          return;
        }
        
        // Handle other error scenarios
        if (retryCount < maxRetries && event.code !== 1000 && event.code !== 1001) {
          // Only retry for unexpected errors, not normal closes
          console.log(`❌ Unexpected close (code: ${event.code}), but NOT retrying to prevent loops`);
          toast.error(`Connection closed unexpectedly (code: ${event.code})`);
        }
        
        // For normal closes or after max retries, just log
        if (event.code === 1000 || event.code === 1001) {
          console.log('✅ WebSocket closed normally');
        } else if (retryCount >= maxRetries) {
          console.error(`❌ Failed to connect after ${maxRetries} attempts`);
          toast.error('Unable to maintain connection to interview session');
          set({ connectionError: 'Connection failed after multiple attempts' });
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        const errorMessage = 'Failed to connect to interview session';
        
        set({ 
          connectionError: errorMessage,
          isConnected: false,
          websocket: null,
          isConnecting: false // Clear connecting flag
        });
        
        // Only show error toast if we've exhausted retries
        if (retryCount >= maxRetries) {
          toast.error(errorMessage);
        }
      };
      
      set({ websocket: ws });
      return ws;
      
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      const errorMessage = 'Failed to create WebSocket connection';
      
      set({ 
        connectionError: errorMessage,
        isConnected: false,
        websocket: null,
        isConnecting: false // Clear connecting flag
      });
      
      // Only show error toast if we've exhausted retries
      if (retryCount >= maxRetries) {
        toast.error(errorMessage);
      }
      throw error;
    }
  },

  // Helper method to connect with proper session detection
  connectToSession: async (sessionId) => {
    const { currentSession, isConnected, isConnecting } = get();
    
    // Don't connect if already connected or connecting
    if (isConnected || isConnecting) {
      console.log(`Skipping connection - already connected: ${isConnected}, connecting: ${isConnecting}`);
      return;
    }
    
    const isNewSession = currentSession?._isNewlyCreated || false;
    
    console.log(`🚀 Connecting to session ${sessionId} (isNew: ${isNewSession})`);
    return await get().connectWebSocket(sessionId, 0, 3, isNewSession);
  },

  // Disconnect WebSocket
  disconnectWebSocket: () => {
    const ws = get().websocket;
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      console.log('🔌 Disconnecting WebSocket');
      ws.close(1000, 'User requested disconnect');
    }
    set({ 
      websocket: null, 
      isConnected: false,
      isConnecting: false 
    });
  },

  // Handle incoming WebSocket messages
  handleWebSocketMessage: (message) => {
    console.log('🎯 Handling WebSocket message:', message);
    const { messages } = get();
    
    try {
      switch (message.type) {
        case 'system':
          console.log('📢 Received system message:', message.content);
          set({ 
            messages: [...messages, {
              id: Date.now(),
              message_type: 'system',
              content: message.content,
              timestamp: new Date().toISOString()
            }]
          });
          break;
          
        case 'question':
          console.log('❓ Received question:', message.content);
          set({ 
            messages: [...messages, {
              id: Date.now(),
              message_type: 'question',
              content: message.content,
              timestamp: new Date().toISOString()
            }]
          });
          break;
          
        case 'final_decision':
          console.log('🏁 Received final decision:', message.content);
          const finalMessage = {
            id: Date.now(),
            message_type: 'final_decision',
            content: message.content,
            timestamp: new Date().toISOString()
          };
          
          set({ 
            messages: [...messages, finalMessage],
            currentSession: {
              ...get().currentSession,
              status: 'completed',
              final_outcome: message.content
            }
          });
          
          toast.success('Interview completed!');
          break;
          
        case 'error':
          console.error('❌ Received error message:', message.content);
          toast.error(`Error: ${message.content}`);
          break;
          
        case 'pong':
          console.log('🏓 Received pong, connection is alive');
          break;
          
        default:
          console.warn('⚠️ Unknown message type:', message.type, message);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      toast.error('Error processing message');
    }
  },

  // Start the interview
  startInterview: () => {
    const ws = get().websocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('🚀 Starting interview...');
      const message = { type: 'start_interview' };
      console.log('📤 Sending message:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not connected. ReadyState:', ws?.readyState);
      toast.error('Not connected to interview session');
    }
  },

  // Send user response
  sendResponse: (content) => {
    const ws = get().websocket;
    const { messages } = get();
    
    if (!content || !content.trim()) {
      toast.error('Please enter a response');
      return;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending user response:', content);
      
      // Add user message to local state immediately
      const userMessage = {
        id: Date.now(),
        message_type: 'response',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
      
      set({ messages: [...messages, userMessage] });
      
      // Send to server
      const message = {
        type: 'user_response',
        content: content.trim()
      };
      
      console.log('📤 Sending message to server:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not connected. ReadyState:', ws?.readyState);
      toast.error('Not connected to interview session');
    }
  },

  // Send ping to keep connection alive
  sendPing: () => {
    const ws = get().websocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('🏓 Sending ping...');
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  },

  // Add a message to the current conversation
  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },

  // Clear current session
  clearSession: () => {
    console.log('🧹 Clearing session...');
    get().disconnectWebSocket();
    set({ 
      currentSession: null, 
      messages: [], 
      isConnected: false, 
      websocket: null,
      connectionError: null,
      isConnecting: false
    });
  },

  // Reset store
  reset: () => {
    console.log('🔄 Resetting interview store...');
    get().disconnectWebSocket();
    set({
      currentSession: null,
      sessions: [],
      messages: [],
      isConnected: false,
      loading: false,
      websocket: null,
      connectionError: null,
      isConnecting: false
    });
  }
}));