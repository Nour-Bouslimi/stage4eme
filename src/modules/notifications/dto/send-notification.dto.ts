import { IsNotEmpty } from 'class-validator';
import { TypeNotification } from '../../../common/enums/type-notification.enum';

export class SendNotificationDto {
  @IsNotEmpty()
  titre: string;

  @IsNotEmpty()
  corps: string;

  type: TypeNotification;

  donnees?: any;
}
