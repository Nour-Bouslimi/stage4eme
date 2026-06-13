import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';

export class CreateLivreurDto {
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  motDePasse: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  typeVehicule?: TypeVehicule;

  @IsOptional()
  @IsNumber()
  poidsMaxKg?: number;
}
