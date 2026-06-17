import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeolocationService } from './geolocation.service';

@Controller()
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    return this.geolocationService.geocode(address);
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.geolocationService.reverseGeocode(Number(lat), Number(lng));
  }

  @UseGuards(JwtAuthGuard)
  @Post('route')
  async route(@Body() body: any) {
    return this.geolocationService.route(body);
  }
}
