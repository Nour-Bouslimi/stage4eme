// src/modules/driver-recommendation/driver-recommendation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/user.entity';
import { Mission } from '../missions/entities/mission.entity';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { StatutDisponibilite } from '../../common/enums/statut-disponibilite.enum';

export interface DriverScore {
  livreur: Utilisateur;
  score: number;
  distanceKm: number;
  scoreDetails: {
    noteScore: number;
    acceptanceScore: number;
    similarityScore: number;
    proximityScore: number;
    availabilityScore: number;
  };
}

@Injectable()
export class DriverRecommendationService {
  private readonly logger = new Logger(DriverRecommendationService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly userRepository: Repository<Utilisateur>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
  ) {}

  /* async recommendDrivers(mission: Mission): Promise<DriverScore[]> {
    // 1. Récupérer tous les livreurs disponibles avec le bon véhicule
    const candidates = await this.userRepository
      .createQueryBuilder('u')
      .where('u.role = :role', { role: 'LIVREUR' })
      .andWhere('u.estActif = true')
      .andWhere('u.statutDisponibilite = :statut', {
        statut: StatutDisponibilite.DISPONIBLE,
      })
      .andWhere(
        mission.typeVehiculeRequis
          ? 'u.typeVehicule = :type'
          : '1=1',
        { type: mission.typeVehiculeRequis },
      )
      .andWhere(
        mission.poidsEstime
          ? 'u.poidsMaxKg >= :poids'
          : '1=1',
        { poids: mission.poidsEstime },
      )
      .andWhere(
        mission.volumeEstime
          ? 'u.volumeMaxM3 >= :volume'
          : '1=1',
        { volume: mission.volumeEstime },
      )
      .andWhere('u.latitudeActuelle IS NOT NULL')
      .andWhere('u.longitudeActuelle IS NOT NULL')
      .getMany();

    this.logger.log(
      `${candidates.length} livreurs candidats pour mission ${mission.id}`,
    );

    if (!candidates.length) return [];

    // 2. Calculer le score pour chaque livreur
    const scored = await Promise.all(
      candidates.map((livreur) =>
        this.scoreDriver(livreur, mission),
      ),
    );

    // 3. Trier par score décroissant
    return scored.sort((a, b) => b.score - a.score);
  } */

  async recommendDrivers(mission: Mission): Promise<DriverScore[]> {
  const qb = this.userRepository
    .createQueryBuilder('u')
    .where('u.role = :role', { role: 'LIVREUR' })
    .andWhere('u.estActif = true')
    .andWhere('u.statutDisponibilite = :statut', {
      statut: StatutDisponibilite.DISPONIBLE,
    })
    .andWhere('u.latitudeActuelle IS NOT NULL')
    .andWhere('u.longitudeActuelle IS NOT NULL');

  // Filtre véhicule : seulement si requis ET le livreur a un véhicule renseigné
  if (mission.typeVehiculeRequis) {
    qb.andWhere(
      '(u.typeVehicule = :type OR u.typeVehicule IS NULL)',
      { type: mission.typeVehiculeRequis },
    );
  }

  // Filtre poids : seulement si le livreur a renseigné sa capacité
  if (mission.poidsEstime) {
    qb.andWhere(
      '(u.poidsMaxKg IS NULL OR u.poidsMaxKg >= :poids)',
      { poids: mission.poidsEstime },
    );
  }

  // Filtre volume : seulement si le livreur a renseigné sa capacité
  if (mission.volumeEstime) {
    qb.andWhere(
      '(u.volumeMaxM3 IS NULL OR u.volumeMaxM3 >= :volume)',
      { volume: mission.volumeEstime },
    );
  }

  const candidates = await qb.getMany();

  this.logger.log(
    `${candidates.length} livreurs candidats pour mission ${mission.id}`,
  );

  if (!candidates.length) return [];

  const scored = await Promise.all(
    candidates.map((livreur) => this.scoreDriver(livreur, mission)),
  );

  return scored.sort((a, b) => b.score - a.score);
}  

  private async scoreDriver(
    livreur: Utilisateur,
    mission: Mission,
  ): Promise<DriverScore> {
    const distanceKm = this.haversine(
      livreur.latitudeActuelle,
      livreur.longitudeActuelle,
      mission.latitudeRamassage,
      mission.longitudeRamassage,
    );

    // Historique du livreur
    const [totalMissions, missionsTerminees, missionsSimilaires] =
      await Promise.all([
        this.missionRepository.count({ where: { livreurId: livreur.id } }),
        this.missionRepository.count({
          where: {
            livreurId: livreur.id,
            statut: StatutMission.TERMINEE,
          },
        }),
        this.missionRepository.count({
          where: {
            livreurId: livreur.id,
            statut: StatutMission.TERMINEE,
            categorie: mission.categorie,
          },
        }),
      ]);

    // ── Calcul des scores partiels (0 → 1 chacun) ──

    // Note moyenne /5 → /1
    const noteScore = Math.min((livreur.noteMoyenne ?? 0) / 5, 1);

    // Taux d'acceptation
    const acceptanceScore =
      totalMissions > 0
        ? Math.min(missionsTerminees / totalMissions, 1)
        : 0.5; // livreur sans historique → score neutre

    // Similarité : missions terminées dans la même catégorie
    const similarityScore =
      missionsTerminees > 0
        ? Math.min(missionsSimilaires / missionsTerminees, 1)
        : 0;

    // Proximité : 0 km → 1, 50 km → 0
    const proximityScore = Math.max(0, 1 - distanceKm / 50);

    // Disponibilité : bonus si en ligne maintenant
    const availabilityScore = livreur.estEnLigne ? 1 : 0.5;

    // ── Score final pondéré ──
    const score =
      noteScore       * 0.30 +
      acceptanceScore * 0.25 +
      proximityScore  * 0.25 +
      similarityScore * 0.10 +
      availabilityScore * 0.10;

    return {
      livreur,
      score: Math.round(score * 100) / 100,
      distanceKm: Math.round(distanceKm * 10) / 10,
      scoreDetails: {
        noteScore:        Math.round(noteScore * 100),
        acceptanceScore:  Math.round(acceptanceScore * 100),
        similarityScore:  Math.round(similarityScore * 100),
        proximityScore:   Math.round(proximityScore * 100),
        availabilityScore:Math.round(availabilityScore * 100),
      },
    };
  }

  private haversine(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): number {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}