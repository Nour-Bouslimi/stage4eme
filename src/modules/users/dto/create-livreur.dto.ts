import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
  MinLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';
import { StatutDisponibilite } from '../../../common/enums/statut-disponibilite.enum';
import { Transform, Type } from 'class-transformer';

class VehicleInputDto {
  @IsOptional()
  @IsString()
  type?: TypeVehicule;

  @IsOptional()
  @IsString()
  immatriculation?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  poidsMax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  volumeMax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rayonService?: number;
}

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

export class CreateLivreurDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @Transform(({ value, obj }) => obj.password ?? obj.temporaryPassword ?? obj.tempPassword ?? value)
  motDePasse?: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  @IsString()
  cin?: string; // Carte d'identité nationale

  @IsOptional()
  @IsString()
  photoCin?: string; // Photo de la CIN (URL ou chemin)

  @IsOptional()
  typeVehicule?: TypeVehicule;

  @IsOptional()
  @IsString()
  immatriculationVehicule?: string;

  @IsOptional()
  @IsString()
  photoVehicule?: string; // Photo unique du véhicule (URL ou chemin)

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleInputDto)
  vehicule?: VehicleInputDto;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // ← convertit string → number
  poidsMaxKg?: number; // Capacité max en poids

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // ← convertit string → number
  volumeMaxM3?: number; // Capacité max en volume

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // ← convertit string → number
  rayonServiceKm?: number; // Zone de couverture

  @IsOptional()
  statutDisponibilite?: StatutDisponibilite; // DISPONIBLE / OCCUPE / HORS_LIGNE

  @IsOptional()
  @IsNumber()
  @Type(() => Number) //  convertit string vers number
  noteMoyenne?: number; // Note moyenne calculée

  @IsOptional()
  @IsNumber()
  @Type(() => Number) //  convertit string vers number
  totalNotes?: number; // Nombre d'évaluations reçues

  @IsOptional()
  @IsNumber()
  @Type(() => Number) //  convertit string vers number
  latitudeActuelle?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) //  convertit string vers number
  longitudeActuelle?: number;

  @IsOptional()
  @IsBoolean()
  estEnLigne?: boolean;

  @IsOptional()
  @IsDateString()
  derniereMiseAJourPosition?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityInputDto)
  disponibilites?: AvailabilityInputDto[];
}
