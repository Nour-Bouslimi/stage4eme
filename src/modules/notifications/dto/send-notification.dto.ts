import { IsNotEmpty } from 'class-validator';
import { TypeNotification } from '../../../common/enums/type-notification.enum';
import { RoleUtilisateur } from '../../../common/enums/role-utilisateur.enum';

export class SendNotificationDto {
  @IsNotEmpty()
  titre: string;

  @IsNotEmpty()
  corps: string;

  type: TypeNotification;

  donnees?: any;

  cibleUserId?: string;

  cibleRole?: RoleUtilisateur;
}
