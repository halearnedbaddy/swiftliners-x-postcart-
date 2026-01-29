import { useCallback, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useToast } from './use-toast';

export interface OrderUpdate {
  orderId: string;
  status: string;
  previousStatus?: string;
  timestamp: string;
  message?: string;
}

interface UseOrderTrackingOptions {
  onOrderUpdate?: (update: OrderUpdate) => void;
}

export function useOrderTracking(options: UseOrderTrackingOptions = {}) {
  const { onOrderUpdate } = options;
  const { toast } = useToast();
  const [recentUpdates, setRecentUpdates] = useState<OrderUpdate[]>([]);
  const [trackedOrders, setTrackedOrders] = useState<Set<string>>(new Set());

  const handleNotification = useCallback((notification: any) => {
    // Handle order status updates from WebSocket
    if (notification.data?.type === 'ORDER_STATUS' || notification.type === 'ORDER_STATUS') {
      const update: OrderUpdate = {
        orderId: notification.data?.orderId || notification.orderId,
        status: notification.data?.status || notification.status,
        previousStatus: notification.data?.previousStatus,
        timestamp: notification.timestamp || new Date().toISOString(),
        message: notification.message,
      };

      setRecentUpdates(prev => [update, ...prev].slice(0, 20));
      
      // Show toast for tracked orders
      if (trackedOrders.has(update.orderId)) {
        toast({
          title: `Order ${update.orderId.slice(0, 8)}... Updated`,
          description: getStatusMessage(update.status),
        });
      }

      onOrderUpdate?.(update);
    }
  }, [onOrderUpdate, toast, trackedOrders]);

  const { isConnected, sendMessage } = useWebSocket({
    onNotification: handleNotification,
  });

  // Subscribe to order updates
  const trackOrder = useCallback((orderId: string) => {
    setTrackedOrders(prev => new Set(prev).add(orderId));
    if (isConnected) {
      sendMessage('subscribe', { type: 'order', orderId });
    }
  }, [isConnected, sendMessage]);

  // Unsubscribe from order updates
  const untrackOrder = useCallback((orderId: string) => {
    setTrackedOrders(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
    if (isConnected) {
      sendMessage('unsubscribe', { type: 'order', orderId });
    }
  }, [isConnected, sendMessage]);

  // Track multiple orders at once
  const trackOrders = useCallback((orderIds: string[]) => {
    orderIds.forEach(id => trackOrder(id));
  }, [trackOrder]);

  return {
    isConnected,
    recentUpdates,
    trackedOrders: Array.from(trackedOrders),
    trackOrder,
    untrackOrder,
    trackOrders,
  };
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'PENDING': 'Order is pending payment',
    'PAID': 'Payment received! Awaiting seller',
    'SHIPPED': 'Seller has shipped your order',
    'DELIVERED': 'Order has been delivered',
    'CONFIRMED': 'Delivery confirmed',
    'COMPLETED': 'Transaction completed successfully',
    'DISPUTED': 'Order is under dispute',
    'REFUNDED': 'Order has been refunded',
    'CANCELLED': 'Order has been cancelled',
  };
  return messages[status] || `Status updated to ${status}`;
}
