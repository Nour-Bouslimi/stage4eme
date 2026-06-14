import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';
import { StatutDisponibilite } from '../../../common/enums/statut-disponibilite.enum';
import { Type } from 'class-transformer';

export class CreateLivreurDto {
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  motDePasse: string;

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
}
