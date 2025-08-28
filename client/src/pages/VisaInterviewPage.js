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
  
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { checkAgentRequirements } = useProfileStore();
  
  const {
    currentSession,
    messages,
    isConnected,
    loading,
    createSession,
    fetchSession,
    connectWebSocket,
    disconnectWebSocket,
    startInterview,
    sendResponse,
    clearSession
  } = useInterviewStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (sessionId) {
          // Load existing session
          await fetchSession(parseInt(sessionId));
        } else {
          // Create new session
          const session = await createSession();
          navigate(`/visa-interview/${session.id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };

    initializeSession();
  }, [sessionId]);

  // Connect WebSocket when session is ready
  useEffect(() => {
    if (currentSession && !isConnected) {
      connectWebSocket(currentSession.id);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [currentSession]);

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
    clearSession();
    navigate('/dashboard');
  };

  // Get message styling based on type
  const getMessageStyling = (messageType) => {
    switch (messageType) {
      case 'system':
        return {
          bg: theme === 'dark' ? 'bg-mocha-surface0' : 'bg-latte-surface0',
          text: theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1',
          icon: ChatBubbleLeftRightIcon,
          align: 'center'
        };
      case 'question':
        return {
          bg: theme === 'dark' ? 'bg-mocha-blue/20' : 'bg-latte-blue/20',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          icon: null,
          align: 'left'
        };
      case 'response':
        return {
          bg: theme === 'dark' ? 'bg-mocha-mauve/20' : 'bg-latte-mauve/20',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          icon: null,
          align: 'right'
        };
      case 'final_decision':
        return {
          bg: theme === 'dark' ? 'bg-mocha-green/20' : 'bg-latte-green/20',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          icon: CheckCircleIcon,
          align: 'center'
        };
      default:
        return {
          bg: theme === 'dark' ? 'bg-mocha-surface0' : 'bg-latte-surface0',
          text: theme === 'dark' ? 'text-mocha-text' : 'text-latte-text',
          icon: null,
          align: 'left'
        };
    }
  };

  // Loading state
  if (loading || !currentSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isCompleted = currentSession.status === 'completed';

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-mocha-base' : 'bg-latte-base'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 backdrop-blur-lg border-b ${
        theme === 'dark' 
          ? 'bg-mocha-base/80 border-mocha-surface1/30' 
          : 'bg-latte-base/80 border-latte-surface1/30'
      }`}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoBack}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-mocha-surface0 text-mocha-text'
                    : 'hover:bg-latte-surface0 text-latte-text'
                }`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className={`text-xl font-semibold ${
                  theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
                }`}>
                  F1 Visa Interview Preparation
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
                }`}>
                  Mock interview session
                </p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected 
                  ? theme === 'dark' ? 'bg-mocha-green' : 'bg-latte-green'
                  : theme === 'dark' ? 'bg-mocha-red' : 'bg-latte-red'
              }`} />
              <span className={`text-sm ${
                theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
              }`}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-6 pb-32">
        <AnimatePresence>
          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message, index) => {
              const styling = getMessageStyling(message.message_type);
              const Icon = styling.icon;
              
              return (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    styling.align === 'right' ? 'justify-end' : 
                    styling.align === 'center' ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-3xl rounded-2xl px-6 py-4 ${styling.bg} ${
                    styling.align === 'center' ? 'text-center' : ''
                  }`}>
                    {Icon && (
                      <div className="flex justify-center mb-2">
                        <Icon className={`w-5 h-5 ${styling.text}`} />
                      </div>
                    )}
                    
                    {/* Message Label */}
                    {message.message_type === 'question' && (
                      <div className={`text-xs font-medium mb-2 ${
                        theme === 'dark' ? 'text-mocha-blue' : 'text-latte-blue'
                      }`}>
                        Visa Officer
                      </div>
                    )}
                    {message.message_type === 'response' && (
                      <div className={`text-xs font-medium mb-2 text-right ${
                        theme === 'dark' ? 'text-mocha-mauve' : 'text-latte-mauve'
                      }`}>
                        You
                      </div>
                    )}
                    
                    <div className={`${styling.text} whitespace-pre-wrap`}>
                      {message.content}
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-xs mt-2 ${
                      styling.align === 'right' ? 'text-right' : 
                      styling.align === 'center' ? 'text-center' : 'text-left'
                    } ${
                      theme === 'dark' ? 'text-mocha-subtext1' : 'text-latte-subtext1'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {/* Start Interview Button */}
            {!isStarted && messages.length > 0 && !isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center py-8"
              >
                <button
                  onClick={handleStartInterview}
                  disabled={!isConnected}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
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
            
            <div ref={messagesEndRef} />
          </div>
        </AnimatePresence>
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
      
      {/* Completion Message */}
      {isCompleted && (
        <div className="fixed bottom-6 left-6 right-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-4xl mx-auto rounded-2xl p-6 text-center ${
              theme === 'dark' 
                ? 'bg-mocha-green/20 border border-mocha-green/30' 
                : 'bg-latte-green/20 border border-latte-green/30'
            }`}
          >
            <CheckCircleIcon className={`w-8 h-8 mx-auto mb-2 ${
              theme === 'dark' ? 'text-mocha-green' : 'text-latte-green'
            }`} />
            <h3 className={`font-semibold mb-2 ${
              theme === 'dark' ? 'text-mocha-text' : 'text-latte-text'
            }`}>
              Interview Completed!
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-mocha-subtext0' : 'text-latte-subtext0'
            }`}>
              Your mock visa interview has been completed. Review the feedback above.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default VisaInterviewPage;