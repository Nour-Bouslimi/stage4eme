import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleUtilisateur } from '../../common/enums/role-utilisateur.enum';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  async getDashboard(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminDashboardService.getDashboard(days, limit);
  }

  @Get('summary')
  async getSummary() {
    return this.adminDashboardService.getSummary();
  }

  @Get('daily-missions')
  async getDailyMissions(@Query('days') days?: string) {
    return this.adminDashboardService.getDailyMissionSeries(days);
  }

  @Get('status-breakdown')
  async getStatusBreakdown() {
    return this.adminDashboardService.getStatusBreakdown();
  }

  @Get('category-breakdown')
  async getCategoryBreakdown() {
    return this.adminDashboardService.getCategoryBreakdown();
  }

  @Get('recent-missions')
  async getRecentMissions(@Query('limit') limit?: string) {
    return this.adminDashboardService.getRecentMissions(limit);
  }

  @Get('top-livreurs')
  async getTopLivreurs(@Query('limit') limit?: string) {
    return this.adminDashboardService.getTopLivreurs(limit);
  }

  @Get('top-clients')
  async getTopClients(@Query('limit') limit?: string) {
    return this.adminDashboardService.getTopClients(limit);
  }

  @Get('unassigned-missions')
  async getUnassignedMissions(@Query('limit') limit?: string) {
    return this.adminDashboardService.getUnassignedMissions(limit);
  }

  @Get('online-livreurs')
  async getOnlineLivreurs(@Query('limit') limit?: string) {
    return this.adminDashboardService.getOnlineLivreurs(limit);
  }
}
