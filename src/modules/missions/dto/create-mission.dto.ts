import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { TypeVehicule } from '../../../common/enums/type-vehicule.enum';

export class CreateMissionDto {
  @IsNotEmpty()
  adresseRamassage: string;

  @IsNotEmpty()
  adresseLivraison: string;

  @IsNumber()
  latitudeRamassage: number;

  @IsNumber()
  longitudeRamassage: number;

  @IsOptional()
  @IsNumber()
  poidsEstime?: number;

  @IsOptional()
  typeVehiculeRequis?: TypeVehicule;
}
