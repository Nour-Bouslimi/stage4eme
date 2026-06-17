import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notation } from './entities/notation.entity';
import { MissionsService } from '../missions/missions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Notation)
    private notationRepo: Repository<Notation>,
    private missionsService: MissionsService,
    private usersService: UsersService,
  ) {}

  async createRating(clientId: string, dto: any) {
    const mission = await this.missionsService.findEntityById(dto.missionId);
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (!mission.livreur) throw new BadRequestException('Mission sans livreur');
    const existing = await this.notationRepo.findOne({ where: { mission: { id: dto.missionId } } });
    if (existing) throw new BadRequestException('Mission déjà notée');
    const rating = this.notationRepo.create({
      etoiles: dto.etoiles,
      commentaire: dto.commentaire,
      client: { id: clientId } as any,
      livreur: mission.livreur as any,
      mission: mission as any,
    } as any);
    const saved = await this.notationRepo.save(rating);
    // update livreur stats
    const livreur = await this.usersService.findById(mission.livreur.id);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    const totalNotes = (livreur.totalNotes || 0) + 1;
    const noteMoyenne = ((Number(livreur.noteMoyenne || 0) * (totalNotes - 1)) + dto.etoiles) / totalNotes;
    livreur.totalNotes = totalNotes;
    livreur.noteMoyenne = Number(noteMoyenne.toFixed(2));
    await this.usersService.save(livreur);
    return saved;
  }
}
