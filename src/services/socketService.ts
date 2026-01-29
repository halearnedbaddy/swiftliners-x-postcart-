import { Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  userId: string;
  type: 'ORDER_STATUS' | 'PAYMENT' | 'DISPUTE' | 'DELIVERY' | 'GENERAL';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export class SocketService {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  // Listen for new notifications
  onNotification(callback: (notification: Notification) => void) {
    this.socket.on('notification:new', callback);
  }

  // Listen for order status updates
  onOrderStatusUpdate(callback: (data: { orderId: string; status: string; timestamp: string }) => void) {
    this.socket.on('order:status-updated', callback);
  }

  // Listen for payment updates
  onPaymentUpdate(callback: (data: { transactionId: string; status: string; amount: number }) => void) {
    this.socket.on('payment:updated', callback);
  }

  // Listen for dispute updates
  onDisputeUpdate(callback: (data: { disputeId: string; status: string; resolution?: string }) => void) {
    this.socket.on('dispute:updated', callback);
  }

  // Listen for delivery updates
  onDeliveryUpdate(callback: (data: { orderId: string; location: string; estimatedTime: string }) => void) {
    this.socket.on('delivery:updated', callback);
  }

  // Emit notification read
  markNotificationAsRead(notificationId: string) {
    this.socket.emit('notification:read', { notificationId });
  }

  // Remove event listeners
  off(event: string) {
    this.socket.off(event);
  }
}
