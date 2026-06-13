import { Controller, Post, UseGuards, Body, Req, Patch, Param, Get } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateMissionDto } from './dto/create-mission.dto';

@Controller('missions')
export class MissionsController {
  constructor(private missionsService: MissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.missionsService.acceptMission(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.missionsService.updateStatus(id, body.statut);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.missionsService.findById(id);
  }
}
