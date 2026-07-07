import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toMessage, toMission } from '../../common/utils/api-mappers';
import { MissionsService } from '../missions/missions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Message } from './entities/message.entity';
import { TypeNotification } from '../../common/enums/type-notification.enum';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message) private msgRepo: Repository<Message>,
    private missionsService: MissionsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async saveMessage(payload: Partial<Message>) {
    const m = this.msgRepo.create(payload as any);
    return (await this.msgRepo.save(m as unknown as Message)) as unknown as Message;
  }

  async getMissionMessages(userId: string, missionId: string) {
    const mission = await this.missionsService.findEntityById(missionId);
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.client?.id !== userId && mission.livreur?.id !== userId) {
      throw new BadRequestException('Accès refusé');
    }
    const messages = await this.msgRepo.find({
      where: { mission: { id: missionId } },
      relations: { auteur: true, mission: true } as any,
      order: { envoyeLe: 'ASC' },
    });
    return messages.map((message) => toMessage(message));
  }

  async sendMessage(
    senderId: string,
    payload: Partial<Message> & { missionId: string; destinataireId?: string; clientMessageId?: string },
  ) {
    const mission = await this.missionsService.findEntityById(payload.missionId);
    if (!mission) throw new NotFoundException('Mission introuvable');

    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('Auteur introuvable');
    if (mission.client?.id !== senderId && mission.livreur?.id !== senderId) {
      throw new BadRequestException('Accès refusé');
    }

    const destinataireId =
      payload.destinataireId ??
      (mission.client?.id === senderId ? mission.livreur?.id : mission.client?.id);

    if (!destinataireId) {
      throw new BadRequestException('Destinataire introuvable');
    }

    const message = await this.saveMessage({
      ...payload,
      auteur: sender,
      destinataireId,
      mission,
      estLu: false,
      envoyeLe: new Date(),
    });

    await this.notificationsService.create({
      utilisateur: { id: destinataireId } as any,
      titre: 'Nouveau message',
      corps: payload.contenu || 'Vous avez reçu un nouveau message',
      type: TypeNotification.NOUVEAU_MESSAGE,
      mission,
      donnees: { missionId: mission.id, messageId: message.id },
    } as any);

    return {
      ...toMessage(message),
      clientMessageId: payload.clientMessageId ?? null,
    };
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.msgRepo.findOne({
      where: { id: messageId },
      relations: { auteur: true, mission: { client: true, livreur: true } as any } as any,
    });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.destinataireId && message.destinataireId !== userId) {
      throw new BadRequestException('Accès refusé');
    }
    message.estLu = true;
    message.luLe = new Date();
    const saved = (await this.msgRepo.save(message as Message)) as Message;
    return toMessage(saved);
  }

  async updateMessage(messageId: string, userId: string, payload: Partial<Message> & { clientMessageId?: string }) {
    const message = await this.msgRepo.findOne({
      where: { id: messageId },
      relations: { auteur: true, mission: true } as any,
    });

    if (!message) throw new NotFoundException('Message introuvable');
    if (message.auteur?.id !== userId) {
      throw new BadRequestException('Accès refusé');
    }

    if (payload.contenu !== undefined) {
      message.contenu = payload.contenu;
    }
    if (payload.urlMedia !== undefined) {
      message.urlMedia = payload.urlMedia;
    }

    const saved = (await this.msgRepo.save(message as Message)) as Message;
    return {
      ...toMessage(saved),
      clientMessageId: payload.clientMessageId ?? null,
    };
  }

  async deleteMessage(messageId: string, userId: string, clientMessageId?: string) {
    const message = await this.msgRepo.findOne({
      where: { id: messageId },
      relations: { auteur: true, mission: true } as any,
    });

    if (!message) throw new NotFoundException('Message introuvable');
    if (message.auteur?.id !== userId) {
      throw new BadRequestException('Accès refusé');
    }

    await this.msgRepo.remove(message as Message);
    return {
      deleted: true,
      id: messageId,
      messageId,
      missionId: message.mission?.id ?? null,
      clientMessageId: clientMessageId ?? null,
    };
  }

  async getConversations(userId: string) {
    const messages = await this.msgRepo.find({
      relations: { auteur: true, mission: { client: true, livreur: true } as any } as any,
      order: { envoyeLe: 'DESC' },
    });

    const filtered = messages.filter((message) => {
      const mission = message.mission;
      return mission?.client?.id === userId || mission?.livreur?.id === userId;
    });

    const grouped = new Map<string, any>();
    for (const message of filtered) {
      const mission = message.mission;
      if (!mission) continue;
      if (!grouped.has(mission.id)) {
        grouped.set(mission.id, {
          missionId: mission.id,
          mission: toMission(mission),
          lastMessage: toMessage(message),
          unreadCount: 0,
        });
      }
      const conversation = grouped.get(mission.id);
      if (!message.estLu && message.destinataireId === userId) {
        conversation.unreadCount += 1;
      }
      conversation.lastMessage = toMessage(message);
    }

    return Array.from(grouped.values());
  }
}
