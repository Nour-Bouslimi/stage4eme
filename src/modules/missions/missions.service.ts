import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { TypeVehicule } from '../../common/enums/type-vehicule.enum';
import {
  NotificationViewer,
  toMission,
  toPublicUser,
} from '../../common/utils/api-mappers';
import { Message } from '../chat/entities/message.entity';
import { GeolocationService } from '../geolocation/geolocation.service';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Notation } from '../ratings/entities/notation.entity';
import { Utilisateur } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { MatchingService } from './matching.service';
import { Mission } from './entities/mission.entity';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private missionRepo: Repository<Mission>,
    private matching: MatchingService,
    private usersService: UsersService,
    @Inject(forwardRef(() => GeolocationService))
    private geolocationService: GeolocationService,
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

  async estimate(dto: CreateMissionDto) {
    return this.buildQuote(dto, { allowManualPrice: false });
  }

  async create(clientId: string, dto: CreateMissionDto) {
    const client = await this.usersService.findById(clientId);
    if (!client) throw new NotFoundException('Client introuvable');

    const payload = this.normalizeCreateDto(dto);
    const quote = await this.buildQuote(payload, { allowManualPrice: false });

    const mission = this.missionRepo.create({
      ...payload,
      adresseRamassage: payload.adresseRamassage,
      adresseLivraison: payload.adresseLivraison,
      latitudeRamassage: quote.start.latitude,
      longitudeRamassage: quote.start.longitude,
      latitudeLivraison: quote.end.latitude,
      longitudeLivraison: quote.end.longitude,
      distanceKm: quote.distanceKm,
      dureeEstimee: quote.dureeEstimee,
      prixEstime: quote.prixEstime,
      client,
      statut: StatutMission.EN_ATTENTE,
    } as any);

    const saved = await this.missionRepo.save(mission as unknown as Mission);

    const candidates = await this.matching.findCandidates({
      latitudeRamassage: quote.start.latitude,
      longitudeRamassage: quote.start.longitude,
      typeVehiculeRequis: payload.typeVehiculeRequis,
      poidsEstime: payload.poidsEstime,
      volumeEstime: payload.volumeEstime,
    });

    const notifications = await this.notificationsService.create({
      cibleRole: RoleUtilisateur.LIVREUR,
      titre: 'Nouvelle mission',
      corps: 'Une nouvelle mission correspond à votre profil',
      type: TypeNotification.NOUVELLE_MISSION,
      mission: saved,
      donnees: { missionId: saved.id },
    });

    for (const notification of notifications) {
      if (!notification.userId) continue;
      this.notificationsGateway.broadcastNotification(notification.userId, {
        id: saved.id,
        type: 'NOUVELLE_MISSION',
        missionId: saved.id,
      });
    }

    return toMission(saved, { userId: client.id, role: client.role });
  }

  private async buildQuote(
    dto: {
      adresseRamassage?: string;
      adresseLivraison?: string;
      latitudeRamassage?: number;
      longitudeRamassage?: number;
      latitudeLivraison?: number;
      longitudeLivraison?: number;
      poidsEstime?: number | null;
      volumeEstime?: number | null;
      typeVehiculeRequis?: TypeVehicule | null;
      dateDemandee?: string | null;
      heureDemandee?: string | null;
      prixEstime?: number | null;
    },
    options: { allowManualPrice: boolean },
  ) {
    const ramassage = await this.resolveCoordinates(
      dto.adresseRamassage,
      dto.latitudeRamassage,
      dto.longitudeRamassage,
    );
    const livraison = await this.resolveCoordinates(
      dto.adresseLivraison,
      dto.latitudeLivraison,
      dto.longitudeLivraison,
    );
    const route = await this.geolocationService.route({
      start: { lat: ramassage.latitude, lng: ramassage.longitude },
      end: { lat: livraison.latitude, lng: livraison.longitude },
    });

    const distanceKm = route.distanceKm;
    const dureeEstimee = route.durationMinutes;
    const pricing = this.calculatePriceBreakdown(
      distanceKm,
      dureeEstimee,
      dto.poidsEstime,
      dto.volumeEstime,
      dto.typeVehiculeRequis,
      dto.dateDemandee,
      dto.heureDemandee,
    );
    const prixEstime =
      options.allowManualPrice && typeof dto.prixEstime === 'number'
        ? dto.prixEstime
        : pricing.total;

    return {
      start: ramassage,
      end: livraison,
      distanceKm,
      dureeEstimee,
      prixEstime,
      pricing,
      route,
    };
  }

  async updateMission(missionId: string, dto: UpdateMissionDto) {
    const mission = await this.findEntityById(missionId);

    const nextAdresseRamassage =
      dto.adresseRamassage ?? dto.depart ?? mission.adresseRamassage;
    const nextAdresseLivraison =
      dto.adresseLivraison ?? dto.destination ?? mission.adresseLivraison;
    const nextLatitudeRamassage =
      typeof dto.latitudeRamassage === 'number'
        ? dto.latitudeRamassage
        : Number(mission.latitudeRamassage);
    const nextLongitudeRamassage =
      typeof dto.longitudeRamassage === 'number'
        ? dto.longitudeRamassage
        : Number(mission.longitudeRamassage);
    const nextLatitudeLivraison =
      typeof dto.latitudeLivraison === 'number'
        ? dto.latitudeLivraison
        : Number(mission.latitudeLivraison);
    const nextLongitudeLivraison =
      typeof dto.longitudeLivraison === 'number'
        ? dto.longitudeLivraison
        : Number(mission.longitudeLivraison);

    const ramassage =
      dto.adresseRamassage ||
      dto.depart ||
      typeof dto.latitudeRamassage === 'number' ||
      typeof dto.longitudeRamassage === 'number'
        ? await this.resolveCoordinates(
            nextAdresseRamassage,
            dto.latitudeRamassage,
            dto.longitudeRamassage,
          )
        : {
            latitude: nextLatitudeRamassage,
            longitude: nextLongitudeRamassage,
          };
    const livraison =
      dto.adresseLivraison ||
      dto.destination ||
      typeof dto.latitudeLivraison === 'number' ||
      typeof dto.longitudeLivraison === 'number'
        ? await this.resolveCoordinates(
            nextAdresseLivraison,
            dto.latitudeLivraison,
            dto.longitudeLivraison,
          )
        : {
            latitude: nextLatitudeLivraison,
            longitude: nextLongitudeLivraison,
          };

    mission.adresseRamassage = nextAdresseRamassage;
    mission.adresseLivraison = nextAdresseLivraison;
    mission.description = dto.description ?? mission.description;
    mission.instructionsSpeciales =
      dto.instructionsSpeciales ?? mission.instructionsSpeciales;
    mission.categorie = dto.categorie ?? mission.categorie;
    mission.typeVehiculeRequis =
      dto.typeVehiculeRequis ??
      dto.vehiculeRequis ??
      mission.typeVehiculeRequis;
    mission.poidsEstime = dto.poidsEstime ?? dto.poids ?? mission.poidsEstime;
    mission.volumeEstime =
      dto.volumeEstime ?? dto.volume ?? mission.volumeEstime;
    mission.dateDemandee =
      dto.dateDemandee ?? dto.dateLivraison ?? mission.dateDemandee;
    mission.heureDemandee = dto.heureDemandee ?? mission.heureDemandee;

    const coordinatesChanged =
      typeof dto.latitudeRamassage === 'number' ||
      typeof dto.longitudeRamassage === 'number' ||
      typeof dto.latitudeLivraison === 'number' ||
      typeof dto.longitudeLivraison === 'number' ||
      dto.adresseRamassage !== undefined ||
      dto.depart !== undefined ||
      dto.adresseLivraison !== undefined ||
      dto.destination !== undefined;

    mission.latitudeRamassage = ramassage.latitude;
    mission.longitudeRamassage = ramassage.longitude;
    mission.latitudeLivraison = livraison.latitude;
    mission.longitudeLivraison = livraison.longitude;

    if (coordinatesChanged) {
      const quote = await this.buildQuote(
        {
          adresseRamassage: nextAdresseRamassage,
          adresseLivraison: nextAdresseLivraison,
          latitudeRamassage: ramassage.latitude,
          longitudeRamassage: ramassage.longitude,
          latitudeLivraison: livraison.latitude,
          longitudeLivraison: livraison.longitude,
          poidsEstime: mission.poidsEstime,
          volumeEstime: mission.volumeEstime,
          typeVehiculeRequis: mission.typeVehiculeRequis,
          dateDemandee: mission.dateDemandee,
          heureDemandee: mission.heureDemandee,
          prixEstime: mission.prixEstime,
        },
        { allowManualPrice: true },
      );
      mission.distanceKm = quote.distanceKm;
      mission.dureeEstimee = quote.dureeEstimee;
      mission.prixEstime = quote.prixEstime;
    } else {
      mission.distanceKm = dto.distanceKm ?? mission.distanceKm;
      mission.dureeEstimee = dto.dureeEstimee ?? mission.dureeEstimee;
      mission.prixEstime =
        dto.prixEstime ??
        dto.prix ??
        this.calculatePriceBreakdown(
          Number(mission.distanceKm ?? 0),
          Number(mission.dureeEstimee ?? 0),
          mission.poidsEstime,
          mission.volumeEstime,
          mission.typeVehiculeRequis,
          mission.dateDemandee,
          mission.heureDemandee,
        ).total;
    }

    const saved = await this.missionRepo.save(mission);
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

  private async geocodeAddress(
    address: string,
  ): Promise<{ latitude: number; longitude: number }> {
    const query = encodeURIComponent(address);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
        {
          headers: {
            'User-Agent': 'backend-stage/1.0',
            Accept: 'application/json',
          },
        },
      );

      if (response.ok) {
        const results = (await response.json()) as Array<{
          lat: string;
          lon: string;
        }>;
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

  private calculatePriceBreakdown(
    distanceKm: number,
    durationMinutes: number,
    poidsEstime?: number | null,
    volumeEstime?: number | null,
    typeVehiculeRequis?: TypeVehicule | null,
    dateDemandee?: string | null,
    heureDemandee?: string | null,
  ) {
    const baseFare = 6;
    const distanceFare = Math.max(0, distanceKm) * 0.95;
    const timeFare = Math.max(0, durationMinutes) * 0.05;
    const weightFare =
      Math.max(0, Number(poidsEstime ?? 0)) > 5
        ? (Number(poidsEstime) - 5) * 0.45
        : 0;
    const volumeFare =
      Math.max(0, Number(volumeEstime ?? 0)) > 0.5
        ? (Number(volumeEstime) - 0.5) * 2.5
        : 0;
    const zoneFare = distanceKm <= 12 ? 2 : distanceKm <= 35 ? 4 : 7;
    const vehicleFare =
      typeVehiculeRequis === TypeVehicule.GROS_CAMION
        ? 10
        : typeVehiculeRequis === TypeVehicule.PETIT_CAMION
          ? 7
          : typeVehiculeRequis === TypeVehicule.FOURGONNETTE
            ? 5
            : typeVehiculeRequis === TypeVehicule.PICKUP
              ? 3.5
              : typeVehiculeRequis === TypeVehicule.VOITURE
                ? 1.5
                : typeVehiculeRequis === TypeVehicule.MOTO ||
                    typeVehiculeRequis === TypeVehicule.SCOOTER
                  ? 0.5
                  : 0;
    const nightFare = this.isNightDelivery(heureDemandee) ? 3 : 0;
    const weekendFare = this.isWeekendDelivery(dateDemandee) ? 2.5 : 0;
    const subtotal =
      baseFare +
      distanceFare +
      timeFare +
      weightFare +
      volumeFare +
      zoneFare +
      vehicleFare +
      nightFare +
      weekendFare;
    const minimumFare = 8;
    const rounded = Math.max(minimumFare, subtotal);
    return {
      baseFare: Number(baseFare.toFixed(2)),
      distanceFare: Number(distanceFare.toFixed(2)),
      timeFare: Number(timeFare.toFixed(2)),
      weightFare: Number(weightFare.toFixed(2)),
      volumeFare: Number(volumeFare.toFixed(2)),
      zoneFare: Number(zoneFare.toFixed(2)),
      vehicleFare: Number(vehicleFare.toFixed(2)),
      nightFare: Number(nightFare.toFixed(2)),
      weekendFare: Number(weekendFare.toFixed(2)),
      total: Number(rounded.toFixed(2)),
    };
  }

  private isNightDelivery(heureDemandee?: string | null) {
    if (!heureDemandee) return false;
    const parsed = this.parseHour(heureDemandee);
    if (parsed === null) return false;
    return parsed >= 22 || parsed < 6;
  }

  private isWeekendDelivery(dateDemandee?: string | null) {
    if (!dateDemandee) return false;
    const parsed = new Date(dateDemandee);
    if (Number.isNaN(parsed.getTime())) return false;
    const day = parsed.getDay();
    return day === 0 || day === 6;
  }

  private parseHour(value: string) {
    const match = value.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (!match) return null;
    const hour = Number(match[1]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
    return hour;
  }

  async findById(id: string, viewer?: NotificationViewer) {
    const mission = await this.missionRepo.findOne({
      where: { id },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
    });
    if (!mission) throw new NotFoundException('Mission non trouvée');
    return toMission(mission, viewer);
  }

  async findEntityById(id: string) {
    const mission = await this.missionRepo.findOne({
      where: { id },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
    });
    if (!mission) throw new NotFoundException('Mission non trouvée');
    return mission;
  }

  async deleteMission(id: string) {
    await this.findEntityById(id);

    await this.missionRepo.manager.transaction(async (manager) => {
      const notificationRepo = manager.getRepository(Notification);
      const messageRepo = manager.getRepository(Message);
      const notationRepo = manager.getRepository(Notation);

      await notificationRepo.delete({ mission: { id } } as any);
      await messageRepo.delete({ mission: { id } } as any);
      await notationRepo.delete({ mission: { id } } as any);
      await manager.getRepository(Mission).delete(id);
    });

    return { deleted: true, id };
  }

  async findByClientId(clientId: string, viewer?: NotificationViewer) {
    const missions = await this.missionRepo.find({
      where: {
        client: { id: clientId },
      },
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
    return missions.map((mission) => toMission(mission, viewer));
  }

  async findByLivreurId(
    livreurId: string,
    options?: { activeOnly?: boolean; viewer?: NotificationViewer },
  ) {
    const where: Record<string, unknown> = {
      livreur: { id: livreurId },
    };

    if (options?.activeOnly) {
      where.statut = In([
        StatutMission.ACCEPTEE,
        StatutMission.EN_ROUTE,
        StatutMission.ARRIVEE,
        StatutMission.EN_LIVRAISON,
      ]);
    }

    const missions = await this.missionRepo.find({
      where: where,
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    return missions.map((mission) => toMission(mission, options?.viewer));
  }

  async findMissions(options?: {
    statut?: string;
    viewer?: NotificationViewer;
  }) {
    const where: Record<string, unknown> = {};

    if (typeof options?.statut === 'string' && options.statut.trim()) {
      where.statut = this.normalizeStatusFilter(options.statut);
    }

    const missions = await this.missionRepo.find({
      where: where,
      relations: {
        client: true,
        livreur: true,
        messages: { auteur: true },
        notifications: true,
        notation: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return missions.map((mission) => toMission(mission, options?.viewer));
  }

  /* async acceptMission(missionId: string, livreurId: string) {
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

    const acceptedNotifications = await this.notificationsService.create({
      cibleUserId: mission.client?.id,
      titre: 'Mission acceptée',
      corps: 'Votre mission a été acceptée',
      type: TypeNotification.MISSION_ACCEPTEE,
      mission: saved,
      donnees: { missionId: saved.id, livreurId: livreur.id },
    } as any);
    for (const notification of acceptedNotifications) {
      if (!notification.userId) continue;
      this.notificationsGateway.broadcastNotification(notification.userId, {
        type: 'MISSION_ACCEPTEE',
        missionId: saved.id,
      });
    }

    return toMission(saved, { userId: mission.client?.id, role: mission.client?.role });
  } */

  async acceptMission(missionId: string, livreurId: string) {
    const mission = await this.findEntityById(missionId);
    if (mission.statut !== StatutMission.EN_ATTENTE) {
      throw new BadRequestException('Mission non disponible');
    }

    const livreur = await this.usersService.findById(livreurId);
    if (!livreur) throw new NotFoundException('Livreur introuvable');
    if (livreur.role !== 'LIVREUR') {
      throw new ConflictException('Seul un livreur peut accepter une mission');
    }
    if (
      livreur.statutDisponibilite !== StatutDisponibilite.DISPONIBLE ||
      !livreur.estEnLigne
    ) {
      throw new ConflictException('Livreur indisponible');
    }

    const accepteeLe = new Date();

    await this.missionRepo.manager.transaction(async (manager) => {
      const result = await manager.query(
        `
          UPDATE missions
          SET "livreurId" = $1,
              statut = $2,
              "accepteeLe" = $3
          WHERE id = $4
          RETURNING id, "livreurId", statut, "accepteeLe"
        `,
        [livreur.id, StatutMission.ACCEPTEE, accepteeLe, mission.id],
      );
      console.log('[acceptMission] update returning =', result?.[0] ?? result);
    });

    await this.missionRepo.manager.update(
      Utilisateur,
      { id: livreur.id },
      { statutDisponibilite: StatutDisponibilite.OCCUPE },
    );

    const saved = await this.findEntityById(missionId);
    console.log('[acceptMission] final db state =', {
      id: saved.id,
      livreurId: (saved as any).livreurId,
      livreur: saved.livreur?.id,
      statut: saved.statut,
    });
    return toMission(saved);
  }

  async updateStatus(
    missionId: string,
    statut: string,
    reason?: string,
    viewer?: NotificationViewer,
  ) {
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

    const saved = await this.missionRepo.save(mission);

    if (mission.client) {
      const notificationType =
        normalizedStatut === StatutMission.ANNULEE
          ? TypeNotification.MISSION_ANNULEE
          : normalizedStatut === StatutMission.ARRIVEE
            ? TypeNotification.LIVREUR_ARRIVE
            : normalizedStatut === StatutMission.TERMINEE ||
                normalizedStatut === StatutMission.LIVREE
              ? TypeNotification.MISSION_TERMINEE
              : TypeNotification.STATUT_CHANGE;
      const statusNotifications = await this.notificationsService.create({
        cibleUserId: mission.client.id,
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
      });
      for (const notification of statusNotifications) {
        if (!notification.userId) continue;
        this.notificationsGateway.broadcastNotification(notification.userId, {
          type: notificationType,
          missionId: saved.id,
          statut: normalizedStatut,
        });
      }
    }

    return toMission(saved, viewer);
  }

  async findCompatibleLivreurs(missionId: string) {
    const mission = await this.findEntityById(missionId);
    const candidates = await this.matching.findCandidates({
      latitudeRamassage: Number(mission.latitudeRamassage),
      longitudeRamassage: Number(mission.longitudeRamassage),
      typeVehiculeRequis: mission.typeVehiculeRequis,
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

  private normalizeStatusFilter(statut: string) {
    const normalized = this.normalizeStatus(statut);
    if (!Object.values(StatutMission).includes(normalized)) {
      throw new BadRequestException(`Statut mission invalide: ${statut}`);
    }
    return normalized;
  }
}
