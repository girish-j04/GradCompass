import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useInterviewStore } from '../stores/interviewStore';
import { useProfileStore } from '../stores/profileStore';
import { useThemeStore } from '../stores/themeStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function VisaInterviewPage() {
  const [userInput, setUserInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const connectionAttempted = useRef(false); // Track if we've attempted connection
  const currentSessionRef = useRef(null); // Track current session to prevent loops
  
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { checkAgentRequirements } = useProfileStore();
  
  const {
    currentSession,
    messages,
    isConnected,
    loading,
    connectionError,
    isConnecting,
    createSession,
    fetchSession,
    connectToSession,
    disconnectWebSocket,
    startInterview,
    sendResponse,
    sendPing,
    clearSession
  } = useInterviewStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session - runs once per sessionId change
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const initializeSession = async () => {
      try {
        if (sessionId) {
          console.log('🔍 Loading existing session:', sessionId);
          if (isMounted) {
            await fetchSession(parseInt(sessionId));
          }
        } else {
          console.log('🆕 Creating new session...');
          if (isMounted) {
            const session = await createSession();
            console.log('✅ New session created:', session.id);
            navigate(`/visa-interview/${session.id}`, { replace: true });
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
      }
    };

    initializeSession();
    
    return () => {
      isMounted = false;
    };
  }, [sessionId]); // Only depend on sessionId, not other state

  // Connect WebSocket when session changes - separate effect with guards
  useEffect(() => {
    let isMounted = true;
    
    const handleConnection = async () => {
      // Guard conditions to prevent infinite loops
      if (!currentSession) {
        console.log('⏳ No current session yet, waiting...');
        return;
      }
      
      if (isConnected) {
        console.log('✅ Already connected, skipping connection attempt');
        return;
      }
      
      if (isConnecting) {
        console.log('🔄 Connection in progress, skipping...');
        return;
      }
      
      // Check if this is the same session we already tried to connect to
      if (currentSessionRef.current === currentSession.id && connectionAttempted.current) {
        console.log('🚫 Already attempted connection for this session, skipping...');
        return;
      }
      
      console.log(`🚀 Initiating connection for session ${currentSession.id}`);
      
      // Mark this session as attempted and store reference
      connectionAttempted.current = true;
      currentSessionRef.current = currentSession.id;
      
      try {
        if (isMounted) {
          await connectToSession(currentSession.id);
        }
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        // Reset attempt flag on error to allow retry
        connectionAttempted.current = false;
      }
    };

    handleConnection();
    
    return () => {
      isMounted = false;
    };
  }, [currentSession]); // Only depend on currentSession

  // Reset connection attempt flag when session changes
  useEffect(() => {
    if (currentSession && currentSessionRef.current !== currentSession.id) {
      console.log(`🔄 Session changed from ${currentSessionRef.current} to ${currentSession.id}, resetting connection flag`);
      connectionAttempted.current = false;
      currentSessionRef.current = null;
    }
  }, [currentSession]);

  // Set up ping interval to keep connection alive
  useEffect(() => {
    let pingInterval;
    
    if (isConnected) {
      console.log('🏓 Setting up keepalive ping interval');
      // Send ping every 4 minutes to keep connection alive
      pingInterval = setInterval(() => {
        console.log('🏓 Sending keepalive ping...');
        sendPing();
      }, 4 * 60 * 1000);
    }
    
    return () => {
      if (pingInterval) {
        console.log('🛑 Clearing ping interval');
        clearInterval(pingInterval);
      }
    };
  }, [isConnected, sendPing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, disconnecting WebSocket');
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Handle interview start
  const handleStartInterview = () => {
    if (isConnected) {
      startInterview();
      setIsStarted(true);
    }
  };

  // Handle sending user response
  const handleSendResponse = (e) => {
    e.preventDefault();
    
    if (!userInput.trim() || !isConnected) return;
    
    sendResponse(userInput.trim());
    setUserInput('');
    
    // Focus input for continuous conversation
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Handle going back to dashboard
  const handleGoBack = () => {
    console.log('🔙 Going back to dashboard');
    clearSession();
    // Reset refs
    connectionAttempted.current = false;
    currentSessionRef.current = null;
    navigate('/dashboard');
  };

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (loading) {
      return (
        <div className={`flex items-center gap-2 text-sm ${
          theme === 'dark' ? 'text-mocha-yellow' : 'text-latte-yellow'
        }`}>
          <ClockIcon className="w-4 h-4 animate-spin" />
          Setting up session...
        </div>
      );
    }
    
    if (isConnecting) {
      return (
        <div className={`flex items-center gap-2 text-sm ${
          theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue'
        }`}>
          <ClockIcon className="w-4 h-4 animate-pulse" />
          Connecting...
        </div>
      );
    }
    
    if (connectionError) {
      return (
        <div className={`flex items-center gap-2 text-sm ${
          theme === 'dark' ? 'text-mocha-red' : 'text-latte-red'
        }`}>
          <ExclamationCircleIcon className="w-4 h-4" />
          {connectionError}
        </div>
      );
    }
    
    if (!isConnected) {
      return (
        <div className={`flex items-center gap-2 text-sm ${
          theme === 'dark' ? 'text-mocha-peach' : 'text-latte-peach'
        }`}>
          <ClockIcon className="w-4 h-4 animate-pulse" />
          Establishing connection...
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-2 text-sm ${
        theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
      }`}>
        <CheckCircleIcon className="w-4 h-4" />
        Connected and ready
      </div>
    );
  };

  // Get message styling based on type
  const getMessageStyling = (messageType) => {
    switch (messageType) {
      case 'system':
        return {
          bg: theme === 'dark' ? 'bg-mocha-blue/20' : 'bg-latte-blue/20',
          text: theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue',
          border: theme === 'dark' ? 'border-mocha-blue/30' : 'border-latte-blue/30'
        };
      case 'question':
        return {
          bg: theme === 'dark' ? 'bg-mocha-surface0' : 'bg-latte-surface0',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          border: theme === 'dark' ? 'border-mocha-surface1' : 'border-latte-surface1'
        };
      case 'response':
        return {
          bg: theme === 'dark' ? 'bg-mocha-mauve/20' : 'bg-latte-mauve/20',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          border: theme === 'dark' ? 'border-mocha-mauve/30' : 'border-latte-mauve/30'
        };
      case 'final_decision':
        return {
          bg: theme === 'dark' ? 'bg-mocha-green/20' : 'bg-latte-green/20',
          text: theme === 'dark' ? 'text-mocha-green' : 'text-latte-green',
          border: theme === 'dark' ? 'border-mocha-green/30' : 'border-latte-green/30'
        };
      default:
        return {
          bg: theme === 'dark' ? 'bg-mocha-surface0' : 'bg-latte-surface0',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          border: theme === 'dark' ? 'border-mocha-surface1' : 'border-latte-surface1'
        };
    }
  };

  // Check if interview is completed
  const isCompleted = currentSession?.status === 'completed';

  if (loading && !currentSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-mocha-base' : 'bg-latte-base'
      }`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-mocha-base' : 'bg-latte-base'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b backdrop-blur-lg ${
        theme === 'dark' 
          ? 'bg-mocha-base/90 border-mocha-surface1/30' 
          : 'bg-latte-base/90 border-latte-surface1/30'
      }`}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoBack}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-mocha-surface0 text-mocha-subtext1 hover:text-mocha-text'
                    : 'hover:bg-latte-surface0 text-latte-subtext1 hover:text-latte-text'
                }`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className={`text-xl font-semibold ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  F1 Visa Interview
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                }`}>
                  Session #{currentSession?.id}
                </p>
              </div>
            </div>
            
            {renderConnectionStatus()}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`pb-24 px-6 ${isStarted || isCompleted ? 'pt-6' : 'pt-0'}`}>
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="popLayout">
            {/* Welcome Card - Only show if not started */}
            {!isStarted && !isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`text-center py-16 ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}
              >
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-mocha-blue/20' : 'bg-latte-blue/20'
                }`}>
                  <ChatBubbleLeftRightIcon className={`w-10 h-10 ${
                    theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue'
                  }`} />
                </div>
                
                <h2 className="text-2xl font-semibold mb-4">
                  Ready for Your Mock Interview?
                </h2>
                
                <p className={`text-lg mb-8 max-w-2xl mx-auto ${
                  theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                }`}>
                  I'll conduct a realistic F1 visa interview based on your profile. 
                  Answer questions naturally and get comprehensive feedback to improve your confidence.
                </p>
                
                <button
                  onClick={handleStartInterview}
                  disabled={!isConnected}
                  className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isConnected 
                      ? theme === 'dark'
                        ? 'bg-mocha-blue hover:bg-mocha-blue/80 text-white'
                        : 'bg-latte-blue hover:bg-latte-blue/80 text-white'
                      : theme === 'dark'
                        ? 'bg-mocha-surface0 text-mocha-subtext1 cursor-not-allowed'
                        : 'bg-latte-surface0 text-latte-subtext1 cursor-not-allowed'
                  }`}
                >
                  {isConnected ? 'Start Interview' : 'Connecting...'}
                </button>
              </motion.div>
            )}
            
            {/* Messages */}
            {messages.map((message, index) => {
              const styling = getMessageStyling(message.message_type);
              const isUser = message.message_type === 'response';
              
              return (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 ${isUser ? 'flex justify-end' : ''}`}
                >
                  <div className={`max-w-3xl p-6 rounded-xl border ${styling.bg} ${styling.border}`}>
                    {message.message_type === 'question' && (
                      <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${
                        theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          theme === 'dark' ? 'bg-mocha-blue' : 'bg-latte-blue'
                        }`} />
                        Visa Officer
                      </div>
                    )}
                    
                    {message.message_type === 'response' && (
                      <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${
                        theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          theme === 'dark' ? 'bg-mocha-mauve' : 'bg-latte-mauve'
                        }`} />
                        You
                      </div>
                    )}
                    
                    <div className={`${styling.text} leading-relaxed`}>
                      {message.content}
                    </div>
                    
                    {message.message_type === 'final_decision' && (
                      <div className={`mt-4 pt-4 border-t ${
                        theme === 'dark' ? 'border-mocha-green/30' : 'border-latte-green/30'
                      }`}>
                        <div className={`text-sm font-medium ${styling.text}`}>
                          🎉 Interview Complete!
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      {isStarted && !isCompleted && (
        <div className={`fixed bottom-0 left-0 right-0 border-t backdrop-blur-lg ${
          theme === 'dark' 
            ? 'bg-mocha-base/90 border-mocha-surface1/30' 
            : 'bg-latte-base/90 border-latte-surface1/30'
        }`}>
          <div className="max-w-4xl mx-auto px-6 py-4">
            <form onSubmit={handleSendResponse} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={!isConnected}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    theme === 'dark'
                      ? 'bg-mocha-surface0 border-mocha-surface1 text-mocha-text placeholder-mocha-subtext1 focus:border-mocha-mauve focus:ring-2 focus:ring-mocha-mauve/20'
                      : 'bg-latte-surface0 border-latte-surface1 text-latte-text placeholder-latte-subtext1 focus:border-latte-mauve focus:ring-2 focus:ring-latte-mauve/20'
                  } disabled:opacity-50 focus:outline-none`}
                  autoFocus
                />
              </div>
              
              <button
                type="submit"
                disabled={!userInput.trim() || !isConnected}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  userInput.trim() && isConnected
                    ? theme === 'dark'
                      ? 'bg-mocha-mauve hover:bg-mocha-mauve/80 text-white'
                      : 'bg-latte-mauve hover:bg-latte-mauve/80 text-white'
                    : theme === 'dark'
                      ? 'bg-mocha-surface0 text-mocha-subtext1 cursor-not-allowed'
                      : 'bg-latte-surface0 text-latte-subtext1 cursor-not-allowed'
                }`}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisaInterviewPage;