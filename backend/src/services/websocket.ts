import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      console.log('🔌 New WebSocket connection attempt');

      // Extract token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        ws.userId = decoded.userId;
        ws.isAlive = true;

        // Add to clients map
        if (!this.clients.has(decoded.userId)) {
          this.clients.set(decoded.userId, new Set());
        }
        this.clients.get(decoded.userId)!.add(ws);

        console.log(`✅ User ${decoded.userId} connected via WebSocket`);

        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'connected',
          timestamp: new Date().toISOString(),
        }));

        // Handle pong responses
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle messages from client
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        // Handle disconnection
        ws.on('close', () => {
          if (ws.userId) {
            const userClients = this.clients.get(ws.userId);
            if (userClients) {
              userClients.delete(ws);
              if (userClients.size === 0) {
                this.clients.delete(ws.userId);
              }
            }
            console.log(`👋 User ${ws.userId} disconnected`);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(4002, 'Invalid token');
      }
    });

    // Ping clients every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.wss?.clients.forEach((ws: AuthenticatedSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('🔌 WebSocket server initialized');
  }

  private handleMessage(ws: AuthenticatedSocket, message: { type: string; data?: unknown }) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      case 'subscribe':
        // Handle subscription to specific events
        console.log(`User ${ws.userId} subscribed to:`, message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationPayload) {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      console.log(`📭 User ${userId} not connected, notification queued`);
      return false;
    }

    const payload = JSON.stringify({
      ...notification,
    });

    userClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    console.log(`📬 Notification sent to user ${userId}`);
    return true;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(notification: NotificationPayload, excludeUserId?: string) {
    const payload = JSON.stringify({
      ...notification,
    });

    this.clients.forEach((clients, userId) => {
      if (excludeUserId && userId === excludeUserId) return;
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    });
  }

  /**
   * Send notification to all admin users
   */
  notifyAdmins(notification: NotificationPayload) {
    const payload = JSON.stringify({
      ...notification,
    });

    // Send to all connected clients - in production, filter by admin role
    this.clients.forEach((clients) => {
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    });

    console.log(`📢 Admin notification broadcast: ${notification.title}`);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.clients.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.clients.has(userId) && this.clients.get(userId)!.size > 0;
  }

  /**
   * Cleanup
   */
  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss?.close();
  }
}

export const wsManager = new WebSocketManager();
