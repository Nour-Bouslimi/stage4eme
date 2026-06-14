/* eslint-disable prettier/prettier */
import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection {
  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    // client joins mission rooms later
  }

  @SubscribeMessage('join')
  async handleJoin(@MessageBody() data: { missionId: string }, @ConnectedSocket() client: Socket) {
    client.join(`mission:${data.missionId}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const saved = await this.chatService.saveMessage(data);
    const room = `mission:${data.missionId}`;
    client.to(room).emit('message', saved);
    return saved;
  }
}
