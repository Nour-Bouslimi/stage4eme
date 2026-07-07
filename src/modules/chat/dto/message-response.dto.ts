export class MessageResponseDto {
  id: string;
  missionId?: string;
  expediteurId?: string;
  destinataireId?: string;
  contenu?: string;
  urlMedia?: string;
  dateEnvoi?: string;
  lu?: boolean;
  type?: string;
  clientMessageId?: string;
}
