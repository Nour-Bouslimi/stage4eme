import {
  IsEmail,
  IsOptional,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';
import { Transform, Type } from 'class-transformer';

export class CreateLivreurDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @Transform(({ value, obj }) => obj.password ?? obj.temporaryPassword ?? obj.tempPassword ?? value)
  motDePasse?: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  @IsString()
  adresseParDefaut?: string;

  @IsOptional()
  typeVehicule?: TypeVehicule;

  @IsOptional()
  @IsString()
  immatriculationVehicule?: string;

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
}
