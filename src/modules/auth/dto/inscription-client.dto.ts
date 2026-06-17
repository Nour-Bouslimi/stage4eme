/* eslint-disable prettier/prettier */
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class InscriptionClientDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Transform(({ value, obj }) => obj.password ?? value)
  motDePasse: string;

  @IsOptional()
  prenom?: string;

  @IsOptional()
  nom?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  adresseParDefaut?: string;

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
  
}
