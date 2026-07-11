export interface Message {
  id: string;
  missionId: string;
  expediteurId: string;
  destinataireId: string;
  contenu: string;
  lu: boolean;
  dateEnvoi: Date;
  clientMessageId?: string;
  pending?: boolean;
  failed?: boolean;
  updatedAt?: Date;
  imageUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

export interface SendMessageRequest {
  missionId: string;
  destinataireId: string;
  contenu: string;
  clientMessageId?: string;
  imageUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

export interface TypingEvent {
  missionId: string;
  userId: string;
  isTyping: boolean;
}
