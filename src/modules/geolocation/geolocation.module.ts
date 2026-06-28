import { Module, forwardRef } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { UsersModule } from '../users/users.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [UsersModule, forwardRef(() => MissionsModule)],
  providers: [GeolocationGateway, GeolocationService],
  controllers: [GeolocationController],
  exports: [GeolocationService],
})
export class GeolocationModule {}
