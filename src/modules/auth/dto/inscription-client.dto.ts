import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class InscriptionClientDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  motDePasse: string;

  @IsOptional()
  prenom?: string;

  @IsOptional()
  nom?: string;
}
