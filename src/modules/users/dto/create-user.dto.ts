import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  motDePasse?: string;

  @IsOptional()
  prenom?: string;

  @IsOptional()
  nom?: string;
}
