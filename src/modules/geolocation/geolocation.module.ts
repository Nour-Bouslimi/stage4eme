import { Module } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [GeolocationGateway, GeolocationService],
  controllers: [GeolocationController],
  exports: [GeolocationService],
})
export class GeolocationModule {}
