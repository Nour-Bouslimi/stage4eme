import { IsOptional } from 'class-validator';
import { StatutMission } from '../../../common/enums/statut-mission.enum';

export class UpdateMissionDto {
  @IsOptional()
  statut?: StatutMission;

  @IsOptional()
  raisonAnnulation?: string;
}
