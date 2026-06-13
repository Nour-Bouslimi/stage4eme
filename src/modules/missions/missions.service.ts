import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from './entities/mission.entity';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MatchingService } from './matching.service';
import { UsersService } from '../users/users.service';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private missionRepo: Repository<Mission>,
    private matching: MatchingService,
    private usersService: UsersService,
  ) {}

  async create(clientId: string, dto: CreateMissionDto) {
    const client = await this.usersService.findById(clientId);
    if (!client) throw new NotFoundException('Client introuvable');
    const m = this.missionRepo.create({
      ...dto,
      client,
      statut: StatutMission.EN_ATTENTE,
    } as any);
    const saved = await this.missionRepo.save(m);
    // find candidates
    const candidates = await this.matching.findCandidates({
      latitudeRamassage: dto.latitudeRamassage,
      longitudeRamassage: dto.longitudeRamassage,
      typeVehiculeRequis: dto.typeVehiculeRequis,
      poidsEstime: dto.poidsEstime,
    });
    return { mission: saved, candidates };
  }

  async findById(id: string) {
    const m = await this.missionRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Mission non trouvée');
    return m;
  }

  async acceptMission(missionId: string, livreurId: string) {
    const mission = await this.findById(missionId);
    if (mission.statut !== StatutMission.EN_ATTENTE) throw new BadRequestException('Mission non disponible');
    // ensure livreur not occupied
    const livreur = await this.usersService.findById(livreurId);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    if (livreur.statutDisponibilite !== 'DISPONIBLE' || !livreur.estEnLigne) throw new ConflictException('Livreur indisponible');
    mission.livreur = livreur;
    mission.statut = StatutMission.ACCEPTEE;
    mission.accepteeLe = new Date();
    await this.missionRepo.save(mission);
    // set livreur occupied
    livreur.statutDisponibilite = StatutDisponibilite.OCCUPE;
    await this.usersService.create(livreur as any);
    return mission;
  }

  async updateStatus(missionId: string, statut: string) {
    const mission = await this.findById(missionId);
    mission.statut = statut as StatutMission;
    if (statut === StatutMission.TERMINEE) {
      // free livreur
      if (mission.livreur) {
        mission.livreur.statutDisponibilite = StatutDisponibilite.DISPONIBLE;
        await this.usersService.create(mission.livreur as any);
      }
    }
    return this.missionRepo.save(mission);
  }
}
