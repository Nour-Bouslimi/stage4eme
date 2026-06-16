export interface Message {
  id: string;
  missionId: string;
  expediteurId: string;
  destinataireId: string;
  contenu: string;
  lu: boolean;
  dateEnvoi: Date;
}

export interface SendMessageRequest {
  missionId: string;
  destinataireId: string;
  contenu: string;
}

export interface TypingEvent {
  missionId: string;
  userId: string;
  isTyping: boolean;
}
