import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { toNotification } from '../../common/utils/api-mappers';
import { Notification } from './entities/notification.entity';
import { Utilisateur } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(Utilisateur) private usersRepo: Repository<Utilisateur>,
  ) {}

  async create(
    notification: Partial<Notification> & {
      cibleUserId?: string;
      cibleRole?: RoleUtilisateur;
    },
  ) {
    const { cibleUserId, cibleRole, utilisateur, ...payload } =
      notification as any;
    const targetUserId = cibleUserId ?? utilisateur?.id ?? null;

    const targetUsers = targetUserId
      ? [{ id: targetUserId }]
      : cibleRole
        ? await this.usersRepo.find({
            where: { role: cibleRole },
            select: { id: true },
          })
        : [];

    if (!targetUsers.length) {
      throw new BadRequestException('Cible de notification introuvable');
    }

    const saved: Notification[] = [];

    for (const targetUser of targetUsers) {
      const n = this.notifRepo.create({
        ...payload,
        utilisateur: { id: targetUser.id } as Utilisateur,
        cibleType: cibleUserId || utilisateur?.id ? 'USER' : 'ROLE',
        cibleRole: cibleRole ?? null,
        cibleUtilisateurId: cibleUserId ?? utilisateur?.id ?? null,
      });
      const row = await this.notifRepo.save(n as unknown as Notification);
      saved.push(row);
    }

    return saved.map((row) => toNotification(row));
  }

  async findForUser(userId: string, role?: RoleUtilisateur) {
    const notifications = await this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.mission', 'mission')
      .leftJoinAndSelect('n.utilisateur', 'utilisateur')
      .where('utilisateur.id = :userId', { userId })
      .andWhere(
        '(n.cibleType IS NULL OR n.cibleType = :targetUserType OR (n.cibleType = :targetRoleType AND (n.cibleRole IS NULL OR n.cibleRole = :role)))',
        {
          targetUserType: 'USER',
          targetRoleType: 'ROLE',
          role,
        },
      )
      .orderBy('n.envoyeeLe', 'DESC')
      .getMany();

    return notifications.map((notification) => toNotification(notification));
  }

  async markAsRead(id: string, userId: string, role?: RoleUtilisateur) {
    const notification = await this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.utilisateur', 'utilisateur')
      .leftJoinAndSelect('n.mission', 'mission')
      .where('n.id = :id', { id })
      .andWhere('utilisateur.id = :userId', { userId })
      .andWhere(
        '(n.cibleType IS NULL OR n.cibleType = :targetUserType OR (n.cibleType = :targetRoleType AND (n.cibleRole IS NULL OR n.cibleRole = :role)))',
        {
          targetUserType: 'USER',
          targetRoleType: 'ROLE',
          role,
        },
      )
      .getOne();

    if (!notification) throw new NotFoundException('Notification introuvable');
    notification.estLue = true;
    notification.lueLe = new Date();
    const saved = await this.notifRepo.save(notification);
    return toNotification(saved);
  }
}
