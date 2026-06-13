import { IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @IsNotEmpty()
  missionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  etoiles: number;

  commentaire?: string;
}
