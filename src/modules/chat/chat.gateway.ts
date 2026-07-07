import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string | undefined;
    if (userId) {
      client.join(`user:${userId}`);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() data: { missionId: string }, @ConnectedSocket() client: Socket) {
    client.join(`mission:${data.missionId}`);
    return { joined: true };
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(@MessageBody() data: { missionId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`mission:${data.missionId}`);
    return { left: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const senderId = data.senderId ?? data.userId ?? client.handshake.query.userId;
    const saved = await this.chatService.sendMessage(String(senderId), data);
    this.broadcastNewMessage(saved);
    return saved;
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const payload = {
      missionId: data.missionId,
      isTyping: !!data.isTyping,
      userId: data.userId ?? client.handshake.query.userId ?? null,
      userName: data.userName ?? null,
    };
    client.to(`mission:${data.missionId}`).emit('typing', payload);
    return { ok: true };
  }

  @SubscribeMessage('editMessage')
  @SubscribeMessage('updateMessage')
  async handleUpdateMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const userId = data.userId ?? client.handshake.query.userId;
    const updated = await this.chatService.updateMessage(String(data.messageId), String(userId), data);
    this.broadcastMessageUpdated(updated);
    return updated;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const userId = data.userId ?? client.handshake.query.userId;
    const deleted = await this.chatService.deleteMessage(String(data.messageId), String(userId), data.clientMessageId);
    this.broadcastMessageDeleted(deleted);
    return deleted;
  }

  broadcastNewMessage(payload: any) {
    if (!this.server) return;
    const missionId = payload.missionId ?? payload.mission?.id;
    if (missionId) {
      this.server.to(`mission:${missionId}`).emit('newMessage', payload);
      this.server.to(`mission:${missionId}`).emit('message', payload);
    }
  }

  broadcastMessageRead(payload: any) {
    if (!this.server) return;
    const missionId = payload.missionId ?? payload.mission?.id;
    if (missionId) {
      this.server.to(`mission:${missionId}`).emit('messageRead', payload);
    }
  }

  broadcastMessageUpdated(payload: any) {
    if (!this.server) return;
    const missionId = payload.missionId ?? payload.mission?.id;
    if (missionId) {
      this.server.to(`mission:${missionId}`).emit('messageUpdated', payload);
    }
  }

  broadcastMessageDeleted(payload: any) {
    if (!this.server) return;
    const missionId = payload.missionId ?? payload.mission?.id;
    if (missionId) {
      this.server.to(`mission:${missionId}`).emit('messageDeleted', payload);
    }
  }
}
