import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ChatService } from '../../../core/services/chat.service';
import { MissionService } from '../../../core/services/mission.service';
import { SocketService } from '../../../core/services/socket.service';
import { Message, SendMessageRequest } from '../../../core/models/message.model';
import { Mission } from '../../../core/models/mission.model';
import { User } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface ConversationSummary {
  missionId: string;
  mission?: Mission | null;
  clientId?: string;
  client?: User | null;
  title: string;
  preview: string;
  time: string;
  unreadCount: number;
}

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
  typingUserName = '';
  loading = true;
  conversations: ConversationSummary[] = [];
  selectedConversation: ConversationSummary | null = null;
  socketReady = false;
  editingMessageId: string | null = null;
  editedContent = '';

  private typingEmitTimer: ReturnType<typeof setTimeout> | null = null;
  private typingResetTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private chatService: ChatService,
    private socketService: SocketService,
    private missionService: MissionService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') || '';
    this.setupSocket();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.emitTyping(false);
    this.clearTypingTimers();

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
        this.messages = (messages || []).map((message) => this.normalizeMessage(message));
        this.loading = false;
        this.scrollToBottom();
        this.markMessagesAsRead(this.messages);
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

    this.clearTypingState();
    this.clearTypingTimers();

    if (this.missionId && this.missionId !== conversation.missionId) {
      this.socketService.leaveRoom(this.missionId);
    }

    this.selectedConversation = conversation;
    this.missionId = conversation.missionId;
    this.clientId = conversation.clientId || this.clientId;
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

    this.socketService.onNewMessage().subscribe((payload: any) => {
      const message = this.normalizeSocketMessage(payload);
      if (this.shouldIgnoreMessage(message)) {
        return;
      }

      this.upsertMessage(message);
      this.scrollToBottom();
    });

    this.socketService.onMessageRead().subscribe((payload: any) => {
      const message = this.normalizeSocketMessage(payload);
      if (this.shouldIgnoreMessage(message)) {
        return;
      }

      this.upsertMessage(message);
    });

    this.socketService.onMessageUpdated().subscribe((payload: any) => {
      const message = this.normalizeSocketMessage(payload);
      if (this.shouldIgnoreMessage(message)) {
        return;
      }

      this.upsertMessage(message);
    });

    this.socketService.onMessageDeleted().subscribe((payload: any) => {
      const messageId = this.resolveMessageId(payload);
      if (!messageId) {
        return;
      }

      this.messages = this.messages.filter((message) => message.id !== messageId && message.clientMessageId !== messageId);

      if (this.editingMessageId === messageId) {
        this.cancelEditing();
      }
    });

    this.socketService.onTyping().subscribe((payload: any) => {
      const currentUserId = this.getCurrentUserId();
      const senderId = String(payload?.userId ?? payload?.senderId ?? '');

      if (senderId && currentUserId && senderId === currentUserId) {
        return;
      }

      if (!payload?.isTyping) {
        this.clearTypingState();
        return;
      }

      this.isTyping = true;
      this.typingUserName = payload?.userName || this.getTypingDisplayName();

      if (this.typingResetTimer) {
        clearTimeout(this.typingResetTimer);
      }

      this.typingResetTimer = setTimeout(() => {
        this.clearTypingState();
      }, 2000);
    });
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || !this.missionId || !this.clientId) {
      return;
    }

    const currentUserId = this.getCurrentUserId();
    const clientMessageId = this.createClientMessageId();
    const optimisticMessage: Message = {
      id: clientMessageId,
      clientMessageId,
      missionId: this.missionId,
      expediteurId: currentUserId,
      destinataireId: this.clientId,
      contenu: content,
      lu: false,
      dateEnvoi: new Date(),
      pending: false
    };

    this.messages = [...this.messages, optimisticMessage];
    this.newMessage = '';
    this.emitTyping(false);
    this.scrollToBottom();

    if (this.socketService.isConnected()) {
      this.socketService.sendMessage(this.missionId, content, this.clientId, clientMessageId);
      return;
    }

    const payload: SendMessageRequest = {
      missionId: this.missionId,
      destinataireId: this.clientId,
      contenu: content
    };

    this.chatService.sendMessage(payload).subscribe({
      next: (message) => {
        this.upsertMessage({
          ...this.normalizeMessage(message),
          clientMessageId,
          pending: false
        });
      },
      error: () => {
        this.messages = this.messages.map((message) =>
          message.clientMessageId === clientMessageId ? { ...message, pending: false, failed: true } : message
        );
        this.newMessage = content;
      }
    });
  }

  startEditing(message: Message): void {
    if (!this.isMyMessage(message)) {
      return;
    }

    this.editingMessageId = message.id;
    this.editedContent = message.contenu;
  }

  cancelEditing(): void {
    this.editingMessageId = null;
    this.editedContent = '';
  }

  saveEdit(): void {
    if (!this.editingMessageId) {
      return;
    }

    const updatedContent = this.editedContent.trim();
    if (!updatedContent) {
      return;
    }

    const targetIndex = this.messages.findIndex((message) => message.id === this.editingMessageId);
    if (targetIndex === -1) {
      this.cancelEditing();
      return;
    }

    const originalMessage = this.messages[targetIndex];
    const updatedMessage: Message = {
      ...originalMessage,
      contenu: updatedContent,
      pending: false,
      updatedAt: new Date()
    };

    this.messages[targetIndex] = updatedMessage;
    this.cancelEditing();

    if (this.socketService.isConnected()) {
      this.socketService.editMessage(originalMessage.id, updatedContent, this.missionId, originalMessage.clientMessageId);
      return;
    }

    this.chatService.updateMessage(originalMessage.id, updatedContent).subscribe({
      next: (message) => {
        this.upsertMessage({
          ...this.normalizeMessage(message),
          pending: false
        });
      },
      error: () => {
        this.messages[targetIndex] = originalMessage;
      }
    });
  }

  deleteMessage(message: Message): void {
    const messageIndex = this.messages.findIndex((item) => item.id === message.id);
    if (messageIndex === -1 || !this.isMyMessage(message)) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmer la suppression',
        message: 'Voulez-vous vraiment supprimer ce message ?',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      const removedMessage = this.messages[messageIndex];
      this.messages = this.messages.filter((item) => item.id !== message.id);

      if (this.editingMessageId === message.id) {
        this.cancelEditing();
      }

      if (this.socketService.isConnected()) {
        this.socketService.deleteMessage(message.id, this.missionId, message.clientMessageId);
        return;
      }

      this.chatService.deleteMessage(message.id).subscribe({
        error: () => {
          this.messages = [...this.messages.slice(0, messageIndex), removedMessage, ...this.messages.slice(messageIndex)];
        }
      });
    });
  }

  onTyping(): void {
    if (!this.missionId) {
      return;
    }

    const content = this.newMessage.trim();
    if (!content) {
      this.clearTypingTimers();
      this.emitTyping(false);
      return;
    }

    if (this.typingEmitTimer) {
      clearTimeout(this.typingEmitTimer);
      this.typingEmitTimer = null;
    }

    this.typingEmitTimer = setTimeout(() => {
      this.emitTyping(true);
      this.typingEmitTimer = null;
    }, 250);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    });
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isMyMessage(message: Message): boolean {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return false;
    }

    return String(message.expediteurId) === String(userId);
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

  trackByMessageId(_: number, message: Message): string {
    return message.clientMessageId || message.id;
  }

  getTypingText(): string {
    return `${this.typingUserName || this.getTypingDisplayName()} est en train d'ecrire...`;
  }

  private emitTyping(isTyping: boolean): void {
    if (!this.missionId) {
      return;
    }

    if (!isTyping && this.typingEmitTimer) {
      clearTimeout(this.typingEmitTimer);
      this.typingEmitTimer = null;
    }

    const userId = this.getCurrentUserId();
    const userName = this.getCurrentUserName();
    this.socketService.sendTyping(this.missionId, isTyping, userId, userName);

    if (!isTyping) {
      this.clearTypingState();
    }
  }

  private clearTypingState(): void {
    this.isTyping = false;
    this.typingUserName = '';

    if (this.typingResetTimer) {
      clearTimeout(this.typingResetTimer);
      this.typingResetTimer = null;
    }
  }

  private clearTypingTimers(): void {
    if (this.typingEmitTimer) {
      clearTimeout(this.typingEmitTimer);
      this.typingEmitTimer = null;
    }

    if (this.typingResetTimer) {
      clearTimeout(this.typingResetTimer);
      this.typingResetTimer = null;
    }
  }

  private shouldIgnoreMessage(message: Message): boolean {
    return !!(this.missionId && message.missionId && message.missionId !== this.missionId);
  }

  private upsertMessage(message: Message): void {
    const normalized = this.normalizeMessage(message);
    const index = this.findMessageIndex(normalized);

    if (index === -1) {
      this.messages = [...this.messages, normalized];
      return;
    }

    this.messages[index] = {
      ...this.messages[index],
      ...normalized,
      pending: false,
      failed: false
    };
  }

  private findMessageIndex(message: Message): number {
    return this.messages.findIndex((item) => {
      if (item.id === message.id) {
        return true;
      }

      return !!message.clientMessageId && item.clientMessageId === message.clientMessageId;
    });
  }

  private normalizeMessage(message: any): Message {
    const payload = message?.message ?? message?.data ?? message ?? {};
    const dateValue = payload.dateEnvoi || payload.createdAt || payload.updatedAt || new Date();

    return {
      id: String(payload.id || payload._id || payload.messageId || payload.clientMessageId || this.createClientMessageId()),
      missionId: String(payload.missionId || this.missionId || ''),
      expediteurId: String(payload.expediteurId || payload.senderId || payload.userId || this.getCurrentUserId()),
      destinataireId: String(payload.destinataireId || payload.recipientId || this.clientId || ''),
      contenu: String(payload.contenu || payload.content || ''),
      lu: !!payload.lu,
      dateEnvoi: this.parseDate(dateValue),
      clientMessageId: payload.clientMessageId,
      pending: !!payload.pending,
      failed: !!payload.failed,
      updatedAt: payload.updatedAt ? this.parseDate(payload.updatedAt) : undefined
    };
  }

  private normalizeSocketMessage(payload: any): Message {
    const normalized = this.normalizeMessage(payload);
    if (!normalized.clientMessageId && payload?.clientMessageId) {
      normalized.clientMessageId = String(payload.clientMessageId);
    }

    return normalized;
  }

  private resolveMessageId(payload: any): string {
    if (!payload) {
      return '';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return String(payload.messageId || payload.id || payload._id || payload.clientMessageId || '');
  }

  private parseDate(value: Date | string | number): Date {
    if (value instanceof Date) {
      return value;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private createClientMessageId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  private getCurrentUserName(): string {
    return `${localStorage.getItem('prenom') || ''} ${localStorage.getItem('nom') || ''}`.trim();
  }

  private getTypingDisplayName(): string {
    if (this.selectedConversation?.client) {
      const client = this.selectedConversation.client;
      return `${client.prenom || ''} ${client.nom || ''}`.trim() || client.email || 'Client';
    }

    if (this.mission?.client) {
      const client = this.mission.client;
      return `${client.prenom || ''} ${client.nom || ''}`.trim() || client.email || 'Client';
    }

    return 'Votre interlocuteur';
  }

  private normalizeConversation(conversation: any): ConversationSummary {
    const mission: Mission | null = conversation?.mission ?? conversation?.missionInfo ?? null;
    const client: User | null = conversation?.client ?? conversation?.user ?? null;
    const missionId = conversation?.missionId || mission?.id || '';
    const clientName = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : '';
    const title = conversation?.title || conversation?.name || conversation?.conversationName || clientName || 'Client';
    const lastMessage = conversation?.lastMessage ?? conversation?.message ?? conversation?.preview ?? '';
    const timeValue = conversation?.updatedAt || conversation?.lastMessageAt || conversation?.dateEnvoi || '';

    return {
      missionId,
      mission,
      clientId: conversation?.clientId || conversation?.userId || client?.id || '',
      client,
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

  private markMessagesAsRead(messages: Message[]): void {
    const currentUserId = this.getCurrentUserId();
    messages.forEach((message) => {
      if (!message.lu && message.expediteurId !== currentUserId) {
        this.chatService.markAsRead(message.id).subscribe({
          next: (updatedMessage) => {
            this.upsertMessage(this.normalizeMessage(updatedMessage));
          },
          error: () => {
            // Ignore errors when marking messages read
          }
        });
      }
    });
  }

  getClientAvatar(): string {
    if (this.selectedConversation?.client?.avatar) {
      return this.selectedConversation.client.avatar;
    }

    return 'assets/default-avatar.svg';
  }

  getClientName(): string {
    if (this.selectedConversation?.client) {
      const client = this.selectedConversation.client;
      const name = `${client.prenom || ''} ${client.nom || ''}`.trim();
      return name || client.email || 'Client';
    }

    if (this.mission?.client) {
      const client = this.mission.client;
      const name = `${client.prenom || ''} ${client.nom || ''}`.trim();
      return name || client.email || 'Client';
    }

    return this.missionId ? 'Client' : 'Messagerie';
  }

  getAddressLabel(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    try {
      const parsed = JSON.parse(value) as { rue?: string; ville?: string; codePostal?: string; pays?: string };
      const parts = [parsed.rue, parsed.ville, parsed.codePostal, parsed.pays]
        .filter((part) => !!part && String(part).trim().length > 0);
      return parts.length > 0 ? parts.join(', ') : value;
    } catch {
      return value;
    }
  }
}
