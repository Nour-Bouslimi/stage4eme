import { IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  prenom?: string;

  @IsOptional()
  nom?: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  adresseParDefaut?: string;
}
