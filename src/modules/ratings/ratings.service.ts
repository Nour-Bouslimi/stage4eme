import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notation } from './entities/notation.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { MissionsService } from '../missions/missions.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Notation)
    private notationRepo: Repository<Notation>,
    private missionsService: MissionsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getRatingSummaryByLivreur(livreurId: string) {
    const livreur = await this.usersService.findById(livreurId);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    if (livreur.role !== RoleUtilisateur.LIVREUR) {
      throw new BadRequestException('L’utilisateur n’est pas un livreur');
    }

    const summary = await this.notationRepo
      .createQueryBuilder('notation')
      .where('notation.livreurId = :livreurId', { livreurId })
      .select('COALESCE(AVG(notation.etoiles), 0)', 'noteMoyenne')
      .addSelect('COUNT(notation.id)', 'totalNotes')
      .addSelect('COALESCE(SUM(notation.etoiles), 0)', 'sommeEtoiles')
      .getRawOne();

    // Récupère la liste détaillée des notations pour le livreur
    const reviewsEntities = await this.notationRepo.find({
      where: { livreur: { id: livreurId } },
      order: { creeLe: 'DESC' },
    });

    const reviews = reviewsEntities.map((r) => ({
      id: r.id,
      etoiles: r.etoiles,
      appreciations: r.appreciations,
      commentaire: r.commentaire,
      creeLe: r.creeLe,
      client: r.client
        ? {
            id: r.client.id,
            prenom: (r.client as any).prenom,
            nom: (r.client as any).nom,
            photo: (r.client as any).photo,
          }
        : null,
      missionId: (r.mission as any)?.id,
    }));

    return {
      livreurId,
      noteMoyenne: Number(Number(summary?.noteMoyenne || 0).toFixed(2)),
      totalNotes: Number(summary?.totalNotes || 0),
      sommeEtoiles: Number(summary?.sommeEtoiles || 0),
      reviews,
    };
  }

  async getTotalRatingsCountByLivreur(livreurId: string) {
    const livreur = await this.usersService.findById(livreurId);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    if (livreur.role !== RoleUtilisateur.LIVREUR) {
      throw new BadRequestException('L’utilisateur n’est pas un livreur');
    }

    const totalNotes = await this.notationRepo
      .createQueryBuilder('notation')
      .where('notation.livreurId = :livreurId', { livreurId })
      .getCount();

    return {
      livreurId,
      totalNotes,
    };
  }

  async createRating(clientId: string, dto: CreateRatingDto) {
    const mission = await this.missionsService.findEntityById(dto.missionId);
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (!mission.livreur) throw new BadRequestException('Mission sans livreur');
    const existing = await this.notationRepo.findOne({
      where: { mission: { id: dto.missionId } },
    });
    if (existing) throw new BadRequestException('Mission déjà notée');
    const rating = this.notationRepo.create({
      etoiles: dto.etoiles,
      appreciations: dto.appreciations,
      commentaire: dto.commentaire,
      client: { id: clientId } as any,
      livreur: mission.livreur as any,
      mission: mission as any,
    } as any);
    const saved = await this.notationRepo.save(rating as any);

    const livreur = await this.usersService.findById(mission.livreur.id);
    if (!livreur) throw new NotFoundException('Livreur introuvable');

    const totalNotes = (livreur.totalNotes || 0) + 1;
    const noteMoyenne =
      (Number(livreur.noteMoyenne || 0) * (totalNotes - 1) + dto.etoiles) /
      totalNotes;
    livreur.totalNotes = totalNotes;
    livreur.noteMoyenne = Number(noteMoyenne.toFixed(2));
    await this.usersService.save(livreur);

    const notifications = await this.notificationsService.create({
      cibleUserId: livreur.id,
      titre: 'Nouvelle évaluation',
      corps:
        'Vous avez reçu une nouvelle évaluation pour votre dernière mission.',
      type: TypeNotification.NOUVELLE_EVALUATION,
      mission: mission,
      donnees: {
        missionId: mission.id,
        notationId: saved.id,
        etoiles: dto.etoiles,
      },
    });

    for (const notification of notifications) {
      if (!notification?.userId) continue;
      this.notificationsGateway.broadcastNotification(notification.userId, {
        id: notification.id,
        type: TypeNotification.NOUVELLE_EVALUATION,
        missionId: mission.id,
        notationId: saved.id,
      });
    }

    return saved;
  }
}
