import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, fromEvent } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;

  constructor() {}

  connect(): void {
    if (!this.socket) {
      const token = localStorage.getItem('token');
      this.socket = io(environment.socketUrl, {
        auth: { token },
        transports: ['websocket']
      });

      this.socket.on('connect_error', (error) => {
        console.error('Erreur de connexion Socket:', error);
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(missionId: string): void {
    if (this.socket) {
      this.socket.emit('joinRoom', { missionId });
    }
  }

  leaveRoom(missionId: string): void {
    if (this.socket) {
      this.socket.emit('leaveRoom', { missionId });
    }
  }

  sendMessage(missionId: string, content: string, destinataireId: string): void {
    if (this.socket) {
      this.socket.emit('sendMessage', {
        missionId,
        contenu: content,
        destinataireId
      });
    }
  }

  sendTyping(missionId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('typing', { missionId, isTyping });
    }
  }

  sendLocation(dataOrMissionId: {
    userId: string;
    missionId: string;
    latitude: number;
    longitude: number;
  } | string, latitude?: number, longitude?: number): void {
    if (this.socket) {
      if (typeof dataOrMissionId === 'string') {
        this.socket.emit('location:update', {
          missionId: dataOrMissionId,
          latitude,
          longitude
        });
        return;
      }

      this.socket.emit('location:update', dataOrMissionId);
    }
  }

  updateMissionStatus(missionId: string, statut: string): void {
    if (this.socket) {
      this.socket.emit('mission:updateStatus', { missionId, statut });
    }
  }

  onNewMessage(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'newMessage');
    }
    return new Observable();
  }

  onMessageRead(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'messageRead');
    }
    return new Observable();
  }

  onTyping(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'typing');
    }
    return new Observable();
  }

  onLocationUpdate(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'location:receive');
    }
    return new Observable();
  }

  onStatusChange(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'mission:statusChanged');
    }
    return new Observable();
  }

  onNouvelleMission(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'nouvelle_mission');
    }
    return new Observable();
  }

  onNotification(): Observable<any> {
    if (this.socket) {
      return fromEvent(this.socket, 'notification');
    }
    return new Observable();
  }
}
