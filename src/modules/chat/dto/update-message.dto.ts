import { IsOptional, IsString } from 'class-validator';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  urlMedia?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
