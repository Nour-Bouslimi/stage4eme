import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  emitToUser(userId: string, event: string, payload: any) {
    // emit to a room per user
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
