import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TypeMessage } from '../../../common/enums/type-message.enum';

export class SendMessageDto {
  @IsNotEmpty()
  missionId: string;

  @IsOptional()
  @IsString()
  contenu?: string;

  @IsOptional()
  @IsString()
  urlMedia?: string;

  @IsOptional()
  @Transform(({ value }) => value ?? TypeMessage.TEXTE)
  type?: TypeMessage;

  @IsOptional()
  destinataireId?: string;
}
