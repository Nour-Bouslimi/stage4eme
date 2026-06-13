import { Controller, Post, Body, UseGuards, Req, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('create-livreur')
  async createLivreur(@Body() dto: CreateLivreurDto) {
    return this.usersService.createLivreur(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('location')
  async updateLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
    return this.usersService.updateLocation(req.user.id, dto.latitude, dto.longitude, dto.estEnLigne);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }
}
