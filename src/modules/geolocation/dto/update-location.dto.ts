import { IsNumber, IsOptional } from 'class-validator';

export class GeolocationUpdateDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  estEnLigne?: boolean;
}
