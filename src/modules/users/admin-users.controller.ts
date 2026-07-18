import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';
import { toPublicUser } from '../../common/utils/api-mappers';

@Controller('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('clients')
  async getClients() {
    const users = await this.usersService.findAllClients();
    return users.map((user) => toPublicUser(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('clients/:id')
  async getClientById(@Param('id') id: string) {
    const user = await this.usersService.findClientById(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('livreurs')
  async getLivreurs() {
    const users = await this.usersService.findAllLivreurs();
    return users.map((user) => toPublicUser(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('livreurs/:id')
  async getLivreurById(@Param('id') id: string) {
    const user = await this.usersService.findLivreurById(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id/desactiver')
  async deactivate(@Param('id') id: string) {
    const user = await this.usersService.deactivateUser(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id/reactiver')
  async reactivate(@Param('id') id: string) {
    const user = await this.usersService.reactivateUser(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('users/:id')
  async remove(@Param('id') id: string) {
    await this.usersService.removeUser(id);
    return { success: true };
  }
}
