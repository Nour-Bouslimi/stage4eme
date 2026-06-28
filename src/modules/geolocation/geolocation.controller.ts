import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeolocationService } from './geolocation.service';

@Controller()
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    if (!address?.trim()) {
      throw new BadRequestException('Adresse manquante');
    }
    return this.geolocationService.geocode(address);
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Coordonnees invalides');
    }
    return this.geolocationService.reverseGeocode(latitude, longitude);
  }

  @UseGuards(JwtAuthGuard)
  @Post('route')
  async route(@Body() body: any) {
    return this.geolocationService.route(body);
  }
}
