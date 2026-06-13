import { Module } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { GeolocationService } from './geolocation.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [GeolocationGateway, GeolocationService],
  exports: [GeolocationService],
})
export class GeolocationModule {}
