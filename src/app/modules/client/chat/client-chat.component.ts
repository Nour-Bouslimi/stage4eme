import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { Message } from '../../../core/models/message.model';
import { Mission } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';

interface ConversationSummary {
  missionId: string;
  mission?: Mission | null;
  driverId?: string;
  driver?: User | null;
  title: string;
  preview: string;
  time: string;
  unreadCount: number;
}

@Component({
  selector: 'app-client-chat',
  templateUrl: './client-chat.component.html',
  styleUrls: ['./client-chat.component.css']
})
export class ClientChatComponent implements OnInit, OnDestroy {
  missionId = '';
  driverId = '';
  mission: Mission | null = null;
  messages: Message[] = [];
  newMessage = '';
  isTyping = false;
  loading = true;
  conversations: ConversationSummary[] = [];
  selectedConversation: ConversationSummary | null = null;
  socketReady = false;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private socketService: SocketService,
    private missionService: MissionService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.driverId = this.route.snapshot.queryParamMap.get('driverId') || '';
    this.setupSocket();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    if (this.missionId) {
      this.socketService.leaveRoom(this.missionId);
    }
    this.socketService.disconnect();
  }

  loadMessages(): void {
    if (!this.missionId) {
      this.loading = false;
      return;
    }

    this.chatService.getMessages(this.missionId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loading = false;
        this.scrollToBottom();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = (conversations || []).map((conversation) => this.normalizeConversation(conversation));

        if (this.missionId) {
          const currentConversation = this.conversations.find((conversation) => conversation.missionId === this.missionId) ?? null;
          if (currentConversation) {
            this.selectConversation(currentConversation, false);
            return;
          }
        }

        if (this.conversations.length > 0) {
          this.selectConversation(this.conversations[0], false);
          return;
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectConversation(conversation: ConversationSummary, updateRoom = true): void {
    if (!conversation?.missionId) {
      return;
    }

    if (this.missionId && this.missionId !== conversation.missionId) {
      this.socketService.leaveRoom(this.missionId);
    }

    this.selectedConversation = conversation;
    this.missionId = conversation.missionId;
    this.driverId = conversation.driverId || this.driverId;
    this.mission = conversation.mission ?? null;
    this.loading = true;

    if (updateRoom) {
      this.socketService.joinRoom(this.missionId);
    }

    if (conversation.mission) {
      this.loadMessages();
      return;
    }

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.loadMessages();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setupSocket(): void {
    if (this.socketReady) {
      return;
    }

    this.socketService.connect();
    this.socketReady = true;

    this.socketService.onNewMessage().subscribe((message: Message) => {
      if (this.missionId && message.missionId && message.missionId !== this.missionId) {
        return;
      }

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
    if (!this.newMessage.trim() || !this.missionId) {
      return;
    }

    this.socketService.sendMessage(this.missionId, this.newMessage, this.driverId);
    this.newMessage = '';
  }

  onTyping(): void {
    if (!this.missionId) {
      return;
    }

    this.socketService.sendTyping(this.missionId, true);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
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

  hasActiveConversation(): boolean {
    return !!this.missionId;
  }

  isSelectedConversation(conversation: ConversationSummary): boolean {
    return this.selectedConversation?.missionId === conversation.missionId;
  }

  getConversationTitle(conversation: ConversationSummary): string {
    return conversation.title || 'Conversation';
  }

  getConversationSubtitle(conversation: ConversationSummary): string {
    return conversation.preview || 'Dernier message...';
  }

  getConversationTime(conversation: ConversationSummary): string {
    return conversation.time || '';
  }

  getUnreadCount(conversation: ConversationSummary): number {
    return conversation.unreadCount || 0;
  }

  private normalizeConversation(conversation: any): ConversationSummary {
    const mission: Mission | null = conversation?.mission ?? conversation?.missionInfo ?? null;
    const driver: User | null = conversation?.driver ?? conversation?.livreur ?? conversation?.user ?? null;
    const missionId = conversation?.missionId || mission?.id || '';
    const driverName = driver ? `${driver.prenom ?? ''} ${driver.nom ?? ''}`.trim() : '';
    const title = conversation?.title || conversation?.name || conversation?.conversationName || driverName || 'Conversation';
    const lastMessage = conversation?.lastMessage ?? conversation?.message ?? conversation?.preview ?? '';
    const timeValue = conversation?.updatedAt || conversation?.lastMessageAt || conversation?.dateEnvoi || '';

    return {
      missionId,
      mission,
      driverId: conversation?.driverId || conversation?.livreurId || driver?.id || '',
      driver,
      title,
      preview: typeof lastMessage === 'string' ? lastMessage : lastMessage?.contenu || 'Dernier message...',
      time: timeValue ? this.formatConversationTime(timeValue) : '',
      unreadCount: conversation?.unreadCount || conversation?.nonLus || 0
    };
  }

  private formatConversationTime(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
