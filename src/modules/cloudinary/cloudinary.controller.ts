/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async testUpload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.cloudinaryService.uploadBuffer(file.buffer, file.originalname);
    return {
      ok: true,
      url: result.secure_url,
      raw: result,
    };
  }
}
