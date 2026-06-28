import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { MatchingService } from './matching.service';
import { Mission } from './entities/mission.entity';
import { UsersModule } from '../users/users.module';
import { Utilisateur } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { GeolocationModule } from '../geolocation/geolocation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mission, Utilisateur]), UsersModule, NotificationsModule, forwardRef(() => GeolocationModule)],
  providers: [MissionsService, MatchingService],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}
