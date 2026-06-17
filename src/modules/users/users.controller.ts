/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { toPublicUser } from '../../common/utils/api-mappers';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private cloudinaryService: CloudinaryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('create-livreur')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photoCin', maxCount: 1 },
        { name: 'photoVehicule', maxCount: 1 },
      ],
      { storage: multer.memoryStorage() },
    ),
  )
  async createLivreur(
    @UploadedFiles() files: { photoCin?: Express.Multer.File[]; photoVehicule?: Express.Multer.File[] },
    @Body() dto: CreateLivreurDto,
  ) {
    if (files?.photoCin?.[0]) {
      const result = await this.cloudinaryService.uploadBuffer(files.photoCin[0].buffer, files.photoCin[0].originalname);
      dto.photoCin = result.secure_url;
    }

    if (files?.photoVehicule?.[0]) {
      const result = await this.cloudinaryService.uploadBuffer(files.photoVehicule[0].buffer, files.photoVehicule[0].originalname);
      dto.photoVehicule = result.secure_url;
    }

    const user = await this.usersService.createLivreur(dto);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('location')
  async updateLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
    const user = await this.usersService.updateLocation(req.user.id, dto.latitude, dto.longitude, dto.estEnLigne);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('livreurs-disponibles')
  async getLivreursDisponibles() {
    const users = await this.usersService.findLivreursDisponibles();
    return users.map((user) => toPublicUser(user));
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) return { error: 'No file provided' };
    const result = await this.cloudinaryService.uploadBuffer(file.buffer, file.originalname);
    await this.usersService.updatePhoto(req.user.id, result.secure_url);
    return { url: result.secure_url };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/clients')
  async getClients() {
    const users = await this.usersService.findAllClients();
    return users.map((user) => toPublicUser(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/livreurs')
  async getLivreurs() {
    const users = await this.usersService.findAllLivreurs();
    return users.map((user) => toPublicUser(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/livreurs/:id')
  async getLivreurById(@Param('id') id: string) {
    const user = await this.usersService.findLivreurById(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/users/:id/desactiver')
  async desactiverUser(@Param('id') id: string) {
    const user = await this.usersService.deactivateUser(id);
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/users/:id')
  async supprimerUser(@Param('id') id: string) {
    await this.usersService.removeUser(id);
    return { success: true };
  }
}
