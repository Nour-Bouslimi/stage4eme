import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private notifRepo: Repository<Notification>) {}

  async create(notification: Partial<Notification>) {
    const n = this.notifRepo.create(notification as any);
    return this.notifRepo.save(n);
  }
}
