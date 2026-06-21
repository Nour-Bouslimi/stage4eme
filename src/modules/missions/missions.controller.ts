import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
  constructor(private missionsService: MissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('estimate')
  async estimate(@Body() dto: CreateMissionDto) {
    return this.missionsService.estimate(dto);
  }

  /* @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.missionsService.acceptMission(id, req.user.id);
  } */

    @UseGuards(JwtAuthGuard)
@Patch(':id/accept')
async accept(@Param('id') id: string, @Req() req: any) {
  console.log('[ACCEPT] missionId =', id);
  console.log('[ACCEPT] req.user =', req.user);
  console.log('[ACCEPT] req.user.id =', req.user?.id);

  return this.missionsService.acceptMission(id, req.user.id);
}
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.missionsService.updateStatus(id, body.statut ?? body.status, body.raisonAnnulation ?? body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missionsService.updateMission(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.LIVREUR)
  @Get('livreur/me')
  async getMyLivreurMissions(@Req() req: any) {
    return this.missionsService.findByLivreurId(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.LIVREUR)
  @Get('livreur/me/active')
  async getMyActiveLivreurMissions(@Req() req: any) {
    return this.missionsService.findByLivreurId(req.user.id, { activeOnly: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.LIVREUR)
  @Get()
  async listMissions(@Query('statut') statut?: string) {
    return this.missionsService.findMissions({ statut });
  }

  @UseGuards(JwtAuthGuard)
  @Get('client/me')
  async getMyMissions(@Req() req: any) {
    return this.missionsService.findByClientId(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.missionsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/livreurs-compatibles')
  async getCompatibleDrivers(@Param('id') id: string) {
    return this.missionsService.findCompatibleLivreurs(id);
  }
}
