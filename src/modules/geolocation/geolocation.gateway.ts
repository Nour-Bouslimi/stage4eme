import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GeolocationService } from './geolocation.service';
import { Server } from 'socket.io';
import { MissionsService } from '../missions/missions.service';

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: ['http://localhost:4200'],
    credentials: true,
  },
})
export class GeolocationGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private geo: GeolocationService,
    @Inject(forwardRef(() => MissionsService))
    private missionsService: MissionsService,
  ) {}

  @SubscribeMessage('update')
  handleLegacyUpdate(
    @MessageBody()
    data: {
      userId: string;
      missionId: string;
      latitude: number;
      longitude: number;
      estEnLigne?: boolean;
    },
  ) {
    return this.handleLocationUpdate(data);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.missionId) {
      throw new WsException('Identifiant de mission manquant');
    }
    client.join(`mission:${data.missionId}`);
    return { joined: true };
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody()
    data: {
      userId: string;
      missionId: string;
      latitude: number;
      longitude: number;
      estEnLigne?: boolean;
    },
  ) {
    if (!data?.userId) {
      throw new WsException('Identifiant utilisateur manquant');
    }
    if (!data?.missionId) {
      throw new WsException('Identifiant de mission manquant');
    }

    await this.geo.updateLocation(
      data.userId,
      data.latitude,
      data.longitude,
      data.estEnLigne,
    );

    const payload = {
      lat: data.latitude,
      lng: data.longitude,
      missionId: data.missionId,
      timestamp: new Date().toISOString(),
    };

    this.server
      .to(`mission:${data.missionId}`)
      .emit('location:receive', payload);
    return { ok: true };
  }

  @SubscribeMessage('mission:updateStatus')
  async handleMissionUpdateStatus(
    @MessageBody()
    data: {
      missionId: string;
      statut: string;
      userId?: string;
    },
  ) {
    if (!data?.missionId) {
      throw new WsException('Identifiant de mission manquant');
    }
    if (!data?.statut) {
      throw new WsException('Statut manquant');
    }

    await this.missionsService.updateStatus(data.missionId, data.statut);

    const timestamp = new Date().toISOString();
    const room = `mission:${data.missionId}`;
    const notificationMessage = `Le statut de la mission est maintenant ${data.statut}`;

    this.server.to(room).emit('mission:statusChanged', {
      missionId: data.missionId,
      statut: data.statut,
      timestamp,
    });

    this.server.to(room).emit('notification', {
      type: 'CHANGEMENT_STATUT',
      missionId: data.missionId,
      statut: data.statut,
      message: notificationMessage,
    });

    return { ok: true };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.missionId) {
      throw new WsException('Identifiant de mission manquant');
    }
    client.leave(`mission:${data.missionId}`);
    return { left: true };
  }
}
