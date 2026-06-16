import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { SocketService } from '../../../core/services/socket.service';
import { Message } from '../../../core/models/message.model';
import { Mission } from '../../../core/models/mission.model';
import { MissionService } from '../../../core/services/mission.service';

@Component({
  selector: 'app-livreur-chat',
  templateUrl: './livreur-chat.component.html',
  styleUrls: ['./livreur-chat.component.css']
})
export class LivreurChatComponent implements OnInit, OnDestroy {
  missionId = '';
  clientId = '';
  mission: Mission | null = null;
  messages: Message[] = [];
  newMessage = '';
  isTyping = false;
  loading = true;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private socketService: SocketService,
    private missionService: MissionService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') || '';
    
    this.loadMission();
    this.loadMessages();
    this.setupSocket();
  }

  ngOnDestroy(): void {
    this.socketService.leaveRoom(this.missionId);
  }

  loadMission(): void {
    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
      }
    });
  }

  loadMessages(): void {
    this.chatService.getMessages(this.missionId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  setupSocket(): void {
    this.socketService.connect();
    this.socketService.joinRoom(this.missionId);

    this.socketService.onNewMessage().subscribe((message: Message) => {
      this.messages.push(message);
      this.scrollToBottom();
    });

    this.socketService.onTyping().subscribe((data: any) => {
      this.isTyping = data.isTyping;
      setTimeout(() => {
        this.isTyping = false;
      }, 3000);
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    this.socketService.sendMessage(
      this.missionId,
      this.newMessage,
      this.clientId
    );

    this.newMessage = '';
  }

  onTyping(): void {
    this.socketService.sendTyping(this.missionId, true);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isMyMessage(message: Message): boolean {
    const userId = localStorage.getItem('userId');
    return message.expediteurId === userId;
  }
}
