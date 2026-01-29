import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { SocketService, Notification } from '@/services/socketService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const socketService = new SocketService(socket);

    // Listen for new notifications
    socketService.onNotification((notification) => {
      setNotifications((prev) => [notification, ...prev]);
      console.log('📬 New notification:', notification);
    });

    // Listen for order updates
    socketService.onOrderStatusUpdate((data) => {
      const notification: Notification = {
        id: `order-${data.orderId}`,
        userId: '', // Will be set by backend
        type: 'ORDER_STATUS',
        title: 'Order Status Updated',
        message: `Your order status changed to: ${data.status}`,
        read: false,
        createdAt: data.timestamp,
        relatedId: data.orderId,
      };
      setNotifications((prev) => [notification, ...prev]);
    });

    // Listen for payment updates
    socketService.onPaymentUpdate((data) => {
      const notification: Notification = {
        id: `payment-${data.transactionId}`,
        userId: '',
        type: 'PAYMENT',
        title: 'Payment Update',
        message: `Payment of KES ${data.amount} ${data.status.toLowerCase()}`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: data.transactionId,
      };
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socketService.off('notification:new');
      socketService.off('order:status-updated');
      socketService.off('payment:updated');
      socketService.off('dispute:updated');
      socketService.off('delivery:updated');
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    if (socket) {
      const socketService = new SocketService(socket);
      socketService.markNotificationAsRead(notificationId);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
