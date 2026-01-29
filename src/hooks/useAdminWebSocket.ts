import { useEffect, useRef, useState, useCallback } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || (() => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const hostname = url.hostname;
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (hostname.includes('replit.dev')) {
      const backendDomain = hostname.replace(/-5000-/, '-8000-');
      return `${protocol}//${backendDomain}`;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//127.0.0.1:8000`;
    }
    
    return `${protocol}//${hostname}:8000`;
  }
  return 'ws://127.0.0.1:8000';
})();

export interface AdminNotification {
  id: string;
  type: 'TRANSACTION_CREATED' | 'DISPUTE_OPENED' | 'USER_REGISTERED' | 'PAYMENT_RECEIVED' | 'DISPUTE_RESOLVED' | 'STORE_CREATED' | 'GENERAL';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface UseAdminWebSocketOptions {
  onNotification?: (notification: AdminNotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const { onNotification, onConnect, onDisconnect } = options;
  const { user } = useSupabaseAuth() ?? {};
  
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    newTransactions: 0,
    newDisputes: 0,
    newUsers: 0,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const getPriority = (type: string): 'low' | 'medium' | 'high' => {
    switch (type) {
      case 'DISPUTE_OPENED':
        return 'high';
      case 'TRANSACTION_CREATED':
      case 'PAYMENT_RECEIVED':
        return 'medium';
      default:
        return 'low';
    }
  };

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || user?.role !== 'admin') {
      console.log('Not admin or no token, skipping admin WebSocket connection');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('🔌 Admin WebSocket connected');
        setIsConnected(true);
        
        // Subscribe to admin events
        ws.send(JSON.stringify({
          type: 'subscribe',
          data: { channel: 'admin' }
        }));
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'notification' || message.type === 'admin:notification') {
            const notification: AdminNotification = {
              id: crypto.randomUUID(),
              type: message.data?.type || 'GENERAL',
              title: message.title || 'Admin Notification',
              message: message.message || '',
              data: message.data,
              timestamp: message.timestamp || new Date().toISOString(),
              read: false,
              priority: getPriority(message.data?.type),
            };
            
            setNotifications((prev) => [notification, ...prev].slice(0, 100));
            setUnreadCount((prev) => prev + 1);
            
            // Update real-time stats
            if (message.data?.type === 'TRANSACTION_CREATED') {
              setStats((prev) => ({ ...prev, newTransactions: prev.newTransactions + 1 }));
            } else if (message.data?.type === 'DISPUTE_OPENED') {
              setStats((prev) => ({ ...prev, newDisputes: prev.newDisputes + 1 }));
            } else if (message.data?.type === 'USER_REGISTERED') {
              setStats((prev) => ({ ...prev, newUsers: prev.newUsers + 1 }));
            }
            
            onNotification?.(notification);
          } else if (message.type === 'connection') {
            console.log('Admin connection confirmed:', message.status);
          }
        } catch (error) {
          console.error('Failed to parse admin WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('🔌 Admin WebSocket disconnected:', event.code);
        setIsConnected(false);
        onDisconnect?.();

        // Auto-reconnect for admins
        if (event.code !== 4001 && event.code !== 4002) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && user?.role === 'admin') {
              console.log('Attempting admin reconnection...');
              connect();
            }
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('Admin WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create admin WebSocket:', error);
    }
  }, [user?.role, onConnect, onDisconnect, onNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Admin disconnected');
      wsRef.current = null;
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const resetStats = useCallback(() => {
    setStats({ newTransactions: 0, newDisputes: 0, newUsers: 0 });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (user?.role === 'admin') {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [user?.role, connect, disconnect]);

  return {
    isConnected,
    notifications,
    unreadCount,
    stats,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    resetStats,
  };
}
