import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class GeolocationService {
  constructor(private usersService: UsersService) {}

  async updateLocation(userId: string, latitude: number, longitude: number, estEnLigne?: boolean) {
    return this.usersService.updateLocation(userId, latitude, longitude, estEnLigne);
  }
}
