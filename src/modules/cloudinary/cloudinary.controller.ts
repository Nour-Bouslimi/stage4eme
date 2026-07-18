/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async testUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('No file provided');

    const safeName = (file.originalname ?? 'upload').replace(/\s+/g, '-');
    const result = await this.cloudinaryService.uploadBuffer(
      Buffer.from(file.buffer),
      {
        folder: 'stage4eme/tests',
        publicId: `test-${Date.now()}-${safeName}`,
      },
    );

    return {
      ok: true,
      uploadedToCloudinary: Boolean(result?.secure_url),
      cloudinaryUrl: result?.secure_url ?? null,
      readyToSaveInDatabase: Boolean(result?.secure_url),
      message:
        'Le fichier a été envoyé à Cloudinary. Vous pouvez maintenant sauvegarder cette URL dans votre base de données.',
      raw: result,
    };
  }
}
