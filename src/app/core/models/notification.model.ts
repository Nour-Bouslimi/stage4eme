export enum NotificationType {
  NOUVELLE_MISSION = 'NOUVELLE_MISSION',
  MISSION_ACCEPTEE = 'MISSION_ACCEPTEE',
  MISSION_ANNULEE = 'MISSION_ANNULEE',
  STATUT_CHANGE = 'STATUT_CHANGE',
  NOUVEAU_MESSAGE = 'NOUVEAU_MESSAGE',
  LIVREUR_ARRIVE = 'LIVREUR_ARRIVE',
  MISSION_TERMINEE = 'MISSION_TERMINEE'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  titre: string;
  message: string;
  missionId?: string;
  lu: boolean;
  luLe?: Date | null;
  createdAt: Date;
}
