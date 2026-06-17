import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { TypeVehicule } from '../../common/enums/type-vehicule.enum';
import { toMission, toPublicUser } from '../../common/utils/api-mappers';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { UsersService } from '../users/users.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { MatchingService } from './matching.service';
import { Mission } from './entities/mission.entity';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private missionRepo: Repository<Mission>,
    private matching: MatchingService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  private normalizeCreateDto(dto: CreateMissionDto) {
    return {
      adresseRamassage: dto.adresseRamassage ?? dto.depart,
      adresseLivraison: dto.adresseLivraison ?? dto.destination,
      description: dto.description ?? null,
      categorie: dto.categorie,
      typeVehiculeRequis: dto.typeVehiculeRequis ?? dto.vehiculeRequis,
      poidsEstime: dto.poidsEstime ?? dto.poids,
      volumeEstime: dto.volumeEstime ?? dto.volume,
      distanceKm: dto.distanceKm,
      dureeEstimee: dto.dureeEstimee,
      dateDemandee: dto.dateDemandee ?? dto.dateLivraison,
      heureDemandee: dto.heureDemandee,
      instructionsSpeciales: dto.instructionsSpeciales ?? null,
      latitudeRamassage: dto.latitudeRamassage,
      longitudeRamassage: dto.longitudeRamassage,
      latitudeLivraison: dto.latitudeLivraison,
      longitudeLivraison: dto.longitudeLivraison,
      prixEstime: dto.prixEstime ?? dto.prix,
    };
  }

  async create(clientId: string, dto: CreateMissionDto) {
    const client = await this.usersService.findById(clientId);
    if (!client) throw new NotFoundException('Client introuvable');

    const payload = this.normalizeCreateDto(dto);
    const ramassage = await this.resolveCoordinates(payload.adresseRamassage, payload.latitudeRamassage, payload.longitudeRamassage);
    const livraison = await this.resolveCoordinates(payload.adresseLivraison, payload.latitudeLivraison, payload.longitudeLivraison);

    const distanceKm = payload.distanceKm ?? this.haversineDistance(ramassage.latitude, ramassage.longitude, livraison.latitude, livraison.longitude);
    const dureeEstimee = payload.dureeEstimee ?? Math.max(1, Math.round((distanceKm / 35) * 60));
    const prixEstime = payload.prixEstime ?? this.estimatePrice(distanceKm, payload.poidsEstime, payload.volumeEstime);

    const mission = this.missionRepo.create({
      ...payload,
      adresseRamassage: payload.adresseRamassage,
      adresseLivraison: payload.adresseLivraison,
      latitudeRamassage: ramassage.latitude,
      longitudeRamassage: ramassage.longitude,
      latitudeLivraison: livraison.latitude,
      longitudeLivraison: livraison.longitude,
      distanceKm,
      dureeEstimee,
      prixEstime,
      client,
      statut: StatutMission.EN_ATTENTE,
    } as any);

    const saved = (await this.missionRepo.save(mission as unknown as Mission)) as unknown as Mission;

    const candidates = await this.matching.findCandidates({
      latitudeRamassage: ramassage.latitude,
      longitudeRamassage: ramassage.longitude,
      typeVehiculeRequis: payload.typeVehiculeRequis as TypeVehicule,
      poidsEstime: payload.poidsEstime,
      volumeEstime: payload.volumeEstime,
    });

    await Promise.all(
      candidates.map((candidate) =>
        this.notificationsService.create({
          utilisateur: candidate as any,
          titre: 'Nouvelle mission',
          corps: 'Une nouvelle mission correspond à votre profil',
          type: TypeNotification.NOUVELLE_MISSION,
          mission: saved,
          donnees: { missionId: saved.id },
        } as any),
      ),
    );

    for (const candidate of candidates) {
      this.notificationsGateway.broadcastNotification(candidate.id, {
        id: saved.id,
        type: 'NOUVELLE_MISSION',
        missionId: saved.id,
      });
    }

    return toMission(saved);
  }

  private async resolveCoordinates(
    address?: string,
    latitude?: number,
    longitude?: number,
  ): Promise<{ latitude: number; longitude: number }> {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return { latitude, longitude };
    }
    if (!address) {
      throw new BadRequestException('Adresse ou coordonnées manquantes');
    }
    return this.geocodeAddress(address);
  }

  private async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const query = encodeURIComponent(address);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`, {
        headers: {
          'User-Agent': 'backend-stage/1.0',
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const results = (await response.json()) as Array<{ lat: string; lon: string }>;
        const firstResult = results[0];
        if (firstResult) {
          return {
            latitude: Number(firstResult.lat),
            longitude: Number(firstResult.lon),
          };
        }
      }
    } catch {
      // fallback below
    }

    const hash = [...address].reduce(
      (acc, char, index) => {
        acc.seed += char.charCodeAt(0) * (index + 1);
        return acc;
      },
      { seed: 0 },
    );
    return {
      latitude: Number(((hash.seed % 9000) / 100).toFixed(6)),
      longitude: Number((((hash.seed * 7) % 18000) / 100).toFixed(6)),
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(2));
  }

  private estimatePrice(distanceKm: number, poidsEstime?: number, volumeEstime?: number) {
    const basePrice = 8.5;
    const distancePrice = distanceKm * 0.9;
    const weightPrice = poidsEstime ? Math.max(0, poidsEstime) * 0.04 : 0;
    const volumePrice = volumeEstime ? Math.max(0, volumeEstime) * 2 : 0;
    return Number((basePrice + distancePrice + weightPrice + volumePrice).toFixed(2));
  }

  async findById(id: string) {
    const mission = await this.missionRepo.findOne({
      where: { id },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true } as any,
        notifications: true,
        notation: true,
      } as any,
    });
    if (!mission) throw new NotFoundException('Mission non trouvée');
    return toMission(mission);
  }

  async findEntityById(id: string) {
    const mission = await this.missionRepo.findOne({
      where: { id },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true } as any,
        notifications: true,
        notation: true,
      } as any,
    });
    if (!mission) throw new NotFoundException('Mission non trouvée');
    return mission;
  }

  async findByClientId(clientId: string) {
    const missions = await this.missionRepo.find({
      where: {
        client: { id: clientId },
      },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true } as any,
        notifications: true,
        notation: true,
      } as any,
      order: {
        createdAt: 'DESC',
      },
    });
    return missions.map((mission) => toMission(mission));
  }

  async acceptMission(missionId: string, livreurId: string) {
    const mission = await this.findEntityById(missionId);
    if (mission.statut !== StatutMission.EN_ATTENTE) throw new BadRequestException('Mission non disponible');

    const livreur = await this.usersService.findById(livreurId);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    if (livreur.role !== 'LIVREUR') {
      throw new ConflictException('Seul un livreur peut accepter une mission');
    }
    if (livreur.statutDisponibilite !== StatutDisponibilite.DISPONIBLE || !livreur.estEnLigne) {
      throw new ConflictException('Livreur indisponible');
    }

    mission.livreur = livreur;
    mission.statut = StatutMission.ACCEPTEE;
    mission.accepteeLe = new Date();
    const saved = (await this.missionRepo.save(mission as unknown as Mission)) as unknown as Mission;

    livreur.statutDisponibilite = StatutDisponibilite.OCCUPE;
    await this.usersService.save(livreur);

    await this.notificationsService.create({
      utilisateur: mission.client as any,
      titre: 'Mission acceptée',
      corps: 'Votre mission a été acceptée',
      type: TypeNotification.MISSION_ACCEPTEE,
      mission: saved,
      donnees: { missionId: saved.id, livreurId: livreur.id },
    } as any);
    this.notificationsGateway.broadcastNotification(mission.client?.id, {
      type: 'MISSION_ACCEPTEE',
      missionId: saved.id,
    });

    return toMission(saved);
  }

  async updateStatus(missionId: string, statut: string, reason?: string) {
    const mission = await this.findEntityById(missionId);
    const normalizedStatut = this.normalizeStatus(statut);
    mission.statut = normalizedStatut;

    if (normalizedStatut === StatutMission.EN_ROUTE) {
      mission.commenceeLe = mission.commenceeLe ?? new Date();
    }

    if (normalizedStatut === StatutMission.ARRIVEE) {
      mission.commenceeLe = mission.commenceeLe ?? new Date();
    }

    if (normalizedStatut === StatutMission.LIVREE) {
      mission.termineeLe = new Date();
    }

    if (normalizedStatut === StatutMission.TERMINEE) {
      mission.termineeLe = new Date();
      if (mission.livreur) {
        mission.livreur.statutDisponibilite = StatutDisponibilite.DISPONIBLE;
        await this.usersService.save(mission.livreur);
      }
    }

    if (normalizedStatut === StatutMission.ANNULEE) {
      mission.annuleeLe = new Date();
      mission.raisonAnnulation = reason ?? mission.raisonAnnulation ?? null;
      if (mission.livreur) {
        mission.livreur.statutDisponibilite = StatutDisponibilite.DISPONIBLE;
        await this.usersService.save(mission.livreur);
      }
    }

    const saved = (await this.missionRepo.save(mission as unknown as Mission)) as unknown as Mission;

    if (mission.client) {
      const notificationType =
        normalizedStatut === StatutMission.ANNULEE
          ? TypeNotification.MISSION_ANNULEE
          : normalizedStatut === StatutMission.ARRIVEE
            ? TypeNotification.LIVREUR_ARRIVE
            : normalizedStatut === StatutMission.TERMINEE || normalizedStatut === StatutMission.LIVREE
              ? TypeNotification.MISSION_TERMINEE
              : TypeNotification.STATUT_CHANGE;
      await this.notificationsService.create({
        utilisateur: mission.client as any,
        titre:
          notificationType === TypeNotification.MISSION_ANNULEE
            ? 'Mission annulée'
            : notificationType === TypeNotification.MISSION_TERMINEE
              ? 'Mission terminée'
              : notificationType === TypeNotification.LIVREUR_ARRIVE
                ? 'Livreur arrivé'
                : 'Statut mission mis à jour',
        corps: `Le statut de la mission est maintenant ${normalizedStatut}`,
        type: notificationType,
        mission: saved,
        donnees: { missionId: saved.id, statut: normalizedStatut },
      } as any);
      this.notificationsGateway.broadcastNotification(mission.client.id, {
        type: notificationType,
        missionId: saved.id,
        statut: normalizedStatut,
      });
    }

    return toMission(saved);
  }

  async findCompatibleLivreurs(missionId: string) {
    const mission = await this.findEntityById(missionId);
    const candidates = await this.matching.findCandidates({
      latitudeRamassage: Number(mission.latitudeRamassage),
      longitudeRamassage: Number(mission.longitudeRamassage),
      typeVehiculeRequis: mission.typeVehiculeRequis as TypeVehicule,
      poidsEstime: Number(mission.poidsEstime ?? 0),
      volumeEstime: Number(mission.volumeEstime ?? 0),
    });
    return candidates.map((user) => toPublicUser(user));
  }

  private normalizeStatus(statut: string) {
    switch (statut) {
      case StatutMission.EN_ROUTE:
      case 'LIVREUR_EN_ROUTE':
        return StatutMission.EN_ROUTE;
      case StatutMission.ARRIVEE:
      case 'ARRIVE_RAMASSAGE':
        return StatutMission.ARRIVEE;
      case 'LIVRE':
        return StatutMission.LIVREE;
      default:
        return statut as StatutMission;
    }
  }
}
