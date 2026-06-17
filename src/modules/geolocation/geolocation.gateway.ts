import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GeolocationService } from './geolocation.service';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/geolocation', cors: true })
export class GeolocationGateway {
  @WebSocketServer()
  server: Server;

  constructor(private geo: GeolocationService) {}

  @SubscribeMessage('update')
  async handleUpdate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // expects { userId, latitude, longitude, estEnLigne }
    await this.geo.updateLocation(data.userId, data.latitude, data.longitude, data.estEnLigne);
    client.broadcast.emit('location:receive', data);
    client.broadcast.emit('position:update', data);
    return { ok: true };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    await this.geo.updateLocation(data.userId, data.latitude, data.longitude, data.estEnLigne);
    client.broadcast.emit('location:receive', data);
    return { ok: true };
  }
}
