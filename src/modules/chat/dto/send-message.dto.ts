import { IsNotEmpty, IsOptional } from 'class-validator';
import { TypeMessage } from '../../../common/enums/type-message.enum';

export class SendMessageDto {
  @IsNotEmpty()
  missionId: string;

  @IsOptional()
  contenu?: string;

  @IsOptional()
  urlMedia?: string;

  type: TypeMessage;
}
