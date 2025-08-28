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
  
  // Create a new interview session
  createSession: async (agentType = 'visa_assistant') => {
    set({ loading: true });
    try {
      const response = await axios.post('/interview/start', {
        agent_type: agentType
      });
      
      const session = response.data;
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

  // WebSocket connection management
  connectWebSocket: (sessionId) => {
    console.log(`Attempting to connect to WebSocket for session ${sessionId}`);
    
    // Clear any existing connection
    get().disconnectWebSocket();
    
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const fullWsUrl = `${wsUrl}/interview/ws/${sessionId}`;
    
    console.log('WebSocket URL:', fullWsUrl);
    
    try {
      const ws = new WebSocket(fullWsUrl);
      
      ws.onopen = (event) => {
        console.log('WebSocket connected successfully', event);
        set({ 
          isConnected: true, 
          websocket: ws, 
          connectionError: null 
        });
        toast.success('Connected to interview session');
      };
      
      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('Parsed message:', message);
          get().handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          console.error('Raw message data:', event.data);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event);
        console.log('Close code:', event.code);
        console.log('Close reason:', event.reason);
        set({ 
          isConnected: false, 
          websocket: null 
        });
        
        // Only show error if it wasn't a normal close
        if (event.code !== 1000 && event.code !== 1001) {
          toast.error(`Connection closed unexpectedly (code: ${event.code})`);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        set({ 
          connectionError: 'Failed to connect to interview session',
          isConnected: false,
          websocket: null
        });
        toast.error('Failed to connect to interview session');
      };
      
      set({ websocket: ws });
      return ws;
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      set({ 
        connectionError: 'Failed to create WebSocket connection',
        isConnected: false,
        websocket: null
      });
      toast.error('Failed to create WebSocket connection');
      throw error;
    }
  },

  // Disconnect WebSocket
  disconnectWebSocket: () => {
    const ws = get().websocket;
    if (ws) {
      console.log('Disconnecting WebSocket');
      ws.close(1000, 'User requested disconnect');
      set({ websocket: null, isConnected: false });
    }
  },

  // Handle incoming WebSocket messages
  handleWebSocketMessage: (message) => {
    console.log('Handling WebSocket message:', message);
    const { messages } = get();
    
    try {
      switch (message.type) {
        case 'system':
          console.log('Received system message:', message.content);
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
          console.log('Received question:', message.content);
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
          console.log('Received final decision:', message.content);
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
          console.error('Received error message:', message.content);
          toast.error(`Error: ${message.content}`);
          break;
          
        default:
          console.warn('Unknown message type:', message.type, message);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      toast.error('Error processing message');
    }
  },

  // Start the interview
  startInterview: () => {
    const ws = get().websocket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('Starting interview...');
      const message = { type: 'start_interview' };
      console.log('Sending message:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected. ReadyState:', ws?.readyState);
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
      console.log('Sending user response:', content);
      
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
      
      console.log('Sending message to server:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected. ReadyState:', ws?.readyState);
      toast.error('Not connected to interview session');
    }
  },

  // Add a message to the current conversation
  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },

  // Clear current session
  clearSession: () => {
    console.log('Clearing session...');
    get().disconnectWebSocket();
    set({ 
      currentSession: null, 
      messages: [], 
      isConnected: false, 
      websocket: null,
      connectionError: null
    });
  },

  // Reset store
  reset: () => {
    console.log('Resetting interview store...');
    get().disconnectWebSocket();
    set({
      currentSession: null,
      sessions: [],
      messages: [],
      isConnected: false,
      loading: false,
      websocket: null,
      connectionError: null
    });
  }
}));