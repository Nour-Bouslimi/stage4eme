import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GeolocationService } from './geolocation.service';

@WebSocketGateway({ namespace: '/geolocation' })
export class GeolocationGateway {
  constructor(private geo: GeolocationService) {}

  @SubscribeMessage('update')
  async handleUpdate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // expects { userId, latitude, longitude, estEnLigne }
    await this.geo.updateLocation(data.userId, data.latitude, data.longitude, data.estEnLigne);
    client.broadcast.emit('position:update', data);
  }
}
