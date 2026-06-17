import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateLocationDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value, obj }) => obj.lat ?? value)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value, obj }) => obj.lng ?? value)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  estEnLigne?: boolean;
}
