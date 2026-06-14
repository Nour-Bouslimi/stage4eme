/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards, Req, Get, Patch, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CreateLivreurDto } from './dto/create-livreur.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateLocationDto } from './dto/update-location.dto';

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
  async createLivreur(@UploadedFiles() files: { photoCin?: Express.Multer.File[]; photoVehicule?: Express.Multer.File[] }, @Body() dto: CreateLivreurDto) {
    if (files?.photoCin && files.photoCin[0]) {
      const result = await this.cloudinaryService.uploadBuffer(files.photoCin[0].buffer, files.photoCin[0].originalname);
      dto.photoCin = result.secure_url;
    }
    if (files?.photoVehicule && files.photoVehicule[0]) {
      const result = await this.cloudinaryService.uploadBuffer(files.photoVehicule[0].buffer, files.photoVehicule[0].originalname);
      dto.photoVehicule = result.secure_url;
    }
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

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) return { error: 'No file provided' };
    const result = await this.cloudinaryService.uploadBuffer(file.buffer, file.originalname);
    await this.usersService.updatePhoto(req.user.id, result.secure_url);
    return { url: result.secure_url };
  }
}
