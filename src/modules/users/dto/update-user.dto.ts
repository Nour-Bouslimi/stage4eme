import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { StatutDisponibilite } from '../../../common/enums/statut-disponibilite.enum';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';

class AvailabilityInputDto {
  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  motDePasse?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsString()
  photoCin?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  adresseParDefaut?: string;

  @IsOptional()
  @IsEnum(TypeVehicule)
  typeVehicule?: TypeVehicule;

  @IsOptional()
  @IsString()
  immatriculationVehicule?: string;

  @IsOptional()
  @IsString()
  photoVehicule?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  poidsMaxKg?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  volumeMaxM3?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rayonServiceKm?: number;

  @IsOptional()
  @IsEnum(StatutDisponibilite)
  statutDisponibilite?: StatutDisponibilite;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  noteMoyenne?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalNotes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitudeActuelle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitudeActuelle?: number;

  @IsOptional()
  @IsBoolean()
  estEnLigne?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalMissions?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  missionsAnnulees?: number;

  @IsOptional()
  @IsDateString()
  derniereActivite?: string;

  @IsOptional()
  @IsDateString()
  derniereMiseAJourPosition?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityInputDto)
  disponibilites?: AvailabilityInputDto[];
}
