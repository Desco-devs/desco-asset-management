"use client";

import { useEffect } from 'react';

const SocketInitializer = () => {
  useEffect(() => {
    // Initialize Socket.io server by making a request to the API route
    const initializeSocket = async () => {
      try {
        await fetch('/api/socket');
        console.log('Socket.io server initialized');
      } catch (error) {
        console.error('Failed to initialize Socket.io server:', error);
      }
    };

    initializeSocket();
  }, []);

  return null; // This component doesn't render anything
};

export default SocketInitializer;