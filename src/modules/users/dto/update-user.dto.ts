import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AvailabilityInputDto {
  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class UpdateUserDto {
  @IsOptional()
  prenom?: string;

  @IsOptional()
  nom?: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  adresseParDefaut?: string;

  @IsOptional()
  photo?: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityInputDto)
  disponibilites?: AvailabilityInputDto[];
}
