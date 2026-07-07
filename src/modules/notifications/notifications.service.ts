import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toNotification } from '../../common/utils/api-mappers';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private notifRepo: Repository<Notification>) {}

  async create(notification: Partial<Notification>) {
    const n = this.notifRepo.create(notification as any);
    const saved = (await this.notifRepo.save(n as unknown as Notification)) as unknown as Notification;
    return toNotification(saved);
  }

  async findForUser(userId: string) {
    const notifications = await this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.mission', 'mission')
      .leftJoinAndSelect('n.utilisateur', 'utilisateur')
      .where('utilisateur.id = :userId', { userId })
      .orderBy('n.envoyeeLe', 'DESC')
      .getMany();

    return notifications.map((notification) => toNotification(notification));
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notifRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.utilisateur', 'utilisateur')
      .leftJoinAndSelect('n.mission', 'mission')
      .where('n.id = :id', { id })
      .andWhere('utilisateur.id = :userId', { userId })
      .getOne();

    if (!notification) throw new NotFoundException('Notification introuvable');
    notification.estLue = true;
    notification.lueLe = new Date();
    const saved = (await this.notifRepo.save(notification as unknown as Notification)) as unknown as Notification;
    return toNotification(saved);
  }
}
