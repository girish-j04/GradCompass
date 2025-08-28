// client/src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const getWebSocketUrl = (path) => {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsUrl}${path}`;
};

export const useWebSocket = (url, onMessage, onOpen, onClose, onError) => {
  const ws = useRef(null);
  const { token } = useAuthStore();
  
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return ws.current;
    }
    
    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = (event) => {
        console.log('WebSocket connected');
        onOpen?.(event);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected');
        onClose?.(event);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
      
      return ws.current;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onError?.(error);
      return null;
    }
  }, [url, onMessage, onOpen, onClose, onError]);
  
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);
  
  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);
  
  const getReadyState = useCallback(() => {
    return ws.current?.readyState || WebSocket.CLOSED;
  }, []);
  
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    connect,
    disconnect,
    send,
    getReadyState,
    isConnected: getReadyState() === WebSocket.OPEN,
    ws: ws.current
  };
};

// Specific hook for interview WebSocket
export const useInterviewWebSocket = (sessionId, handlers = {}) => {
  const url = sessionId ? getWebSocketUrl(`/interview/ws/${sessionId}`) : null;
  
  return useWebSocket(
    url,
    handlers.onMessage,
    handlers.onOpen,
    handlers.onClose,
    handlers.onError
  );
};