import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useSupabaseAuth() ?? {};

  useEffect(() => {
    if (!user?.id) return;

    // Get the domain from environment or construct it
    const domain = window.location.origin.replace(':5000', ':4000');

    // Initialize socket connection
    socketRef.current = io(domain, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Join user's notification room
    socketRef.current.emit('join-notifications', user.id);

    // Log connection status
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?.id]);

  return socketRef.current;
}
