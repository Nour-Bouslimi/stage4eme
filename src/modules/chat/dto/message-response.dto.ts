export class MessageResponseDto {
  id: string;
  missionId?: string;
  expediteurId?: string;
  destinataireId?: string;
  contenu?: string;
  urlMedia?: string;
  mediaUrl?: string;
  imageUrl?: string;
  hasMedia?: boolean;
  isImage?: boolean;
  dateEnvoi?: string;
  lu?: boolean;
  type?: string;
  clientMessageId?: string;
}
