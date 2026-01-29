import { Server, Socket } from 'socket.io';

class SocketService {
  private io: Server | null = null;

  public init(io: Server) {
    this.io = io;
    console.log('🔌 SocketService initialized');
  }

  public emitToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('SocketService not initialized');
      return;
    }
    // Emitting to room "user:userId" which users join upon connection
    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`📡 Emitted ${event} to user:${userId}`);
  }
}

export const socketService = new SocketService();
