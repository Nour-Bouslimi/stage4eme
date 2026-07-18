// src/modules/driver-recommendation/driver-recommendation.controller.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { DriverRecommendationService } from './driver-recommendation.service';
import { MissionsService } from '../missions/missions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('driver-recommendation')
@UseGuards(JwtAuthGuard)
export class DriverRecommendationController {
  constructor(
    private readonly recommendationService: DriverRecommendationService,
    private readonly missionService: MissionsService,
  ) {}

  @Get(':missionId')
  async recommend(@Param('missionId') missionId: string) {
    const mission = await this.missionService.findEntityById(missionId);

    const results = await this.recommendationService.recommendDrivers(mission);

    return results.map((r, index) => ({
      rank: index + 1,
      id: r.livreur.id,
      prenom: r.livreur.prenom,
      nom: r.livreur.nom,
      photo: r.livreur.photo,
      typeVehicule: r.livreur.typeVehicule,
      noteMoyenne: r.livreur.noteMoyenne,
      totalMissions: r.livreur.totalMissions,
      estEnLigne: r.livreur.estEnLigne,
      telephone: r.livreur.telephone,
      latitudeActuelle: r.livreur.latitudeActuelle,
      longitudeActuelle: r.livreur.longitudeActuelle,
      score: r.score,
      distanceKm: r.distanceKm,
      scoreDetails: r.scoreDetails,
    }));
  }
}
