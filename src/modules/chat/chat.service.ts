import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Utilisateur } from '../users/entities/user.entity';
import { Mission } from '../missions/entities/mission.entity';

@Injectable()
export class ChatService {
  constructor(@InjectRepository(Message) private msgRepo: Repository<Message>) {}

  async saveMessage(payload: Partial<Message>) {
    const m = this.msgRepo.create(payload as any);
    return this.msgRepo.save(m);
  }
}
