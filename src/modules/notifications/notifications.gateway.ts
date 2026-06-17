import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  emitToUser(userId: string, event: string, payload: any) {
    // emit to a room per user
    if (!this.server) {
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastNotification(userId: string, payload: any) {
    this.emitToUser(userId, 'notification', payload);
    const eventMap: Record<string, string> = {
      NOUVELLE_MISSION: 'nouvelle_mission',
      MISSION_ACCEPTEE: 'mission_acceptee',
      MISSION_ANNULEE: 'mission_annulee',
      STATUT_CHANGE: 'statut_change',
      MISSION_TERMINEE: 'mission_terminee',
      NOUVEAU_MESSAGE: 'nouveau_message',
      LIVREUR_ARRIVE: 'livreur_arrive',
    };
    const eventName = payload?.type ? eventMap[payload.type] : undefined;
    if (eventName) {
      this.emitToUser(userId, eventName, payload);
    }
  }
}
