import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { Utilisateur } from './entities/user.entity';
import { DisponibiliteLivreur } from './entities/disponibilite-livreur.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MailModule } from '../mail/mail.module';
import { GeolocationModule } from '../geolocation/geolocation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, DisponibiliteLivreur]),
    CloudinaryModule,
    MailModule,
    forwardRef(() => GeolocationModule),
  ],
  providers: [UsersService],
  controllers: [UsersController, AdminUsersController],
  exports: [UsersService],
})
export class UsersModule {}
