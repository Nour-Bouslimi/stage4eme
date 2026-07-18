import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Appreciation } from '../enums/appreciation.enum';

export class CreateRatingDto {
  @IsNotEmpty()
  missionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  etoiles: number;

  @IsOptional()
  @IsEnum(Appreciation, { each: true })
  appreciations?: Appreciation[];

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => value ?? obj.comment)
  commentaire?: string;
}
