import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CategorieMission } from '../../../common/enums/categorie-mission.enum';
import { StatutMission } from '../../../common/enums/statut-mission.enum';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  adresseRamassage?: string;

  @IsOptional()
  @IsString()
  adresseLivraison?: string;

  @IsOptional()
  @IsString()
  instructionsSpeciales?: string;

  @IsOptional()
  @IsEnum(CategorieMission)
  categorie?: CategorieMission;

  @IsOptional()
  @IsEnum(TypeVehicule)
  typeVehiculeRequis?: TypeVehicule;

  @IsOptional()
  @IsEnum(TypeVehicule)
  vehiculeRequis?: TypeVehicule;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitudeRamassage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitudeRamassage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitudeLivraison?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitudeLivraison?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  poidsEstime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  poids?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volumeEstime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dureeEstimee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  prixEstime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  prix?: number;

  @IsOptional()
  @IsString()
  depart?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  dateLivraison?: string;

  @IsOptional()
  @IsString()
  dateDemandee?: string;

  @IsOptional()
  @IsString()
  heureDemandee?: string;

  @IsOptional()
  @IsEnum(StatutMission)
  statut?: StatutMission;

  @IsOptional()
  @IsString()
  raisonAnnulation?: string;
}
