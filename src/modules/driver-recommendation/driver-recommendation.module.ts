import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverRecommendationService } from './driver-recommendation.service';
import { DriverRecommendationController } from './driver-recommendation.controller';
import { Utilisateur } from '../users/entities/user.entity';
import { Mission } from '../missions/entities/mission.entity';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, Mission]), MissionsModule],
  providers: [DriverRecommendationService],
  controllers: [DriverRecommendationController],
})
export class DriverRecommendationModule {}
