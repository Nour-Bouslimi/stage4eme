import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class SendImageMessageDto {
  @IsNotEmpty()
  @IsString()
  missionId: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  urlMedia?: string;

  @IsOptional()
  @IsString()
  destinataireId?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
