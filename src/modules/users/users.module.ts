import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Utilisateur } from './entities/user.entity';
import { DisponibiliteLivreur } from './entities/disponibilite-livreur.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, DisponibiliteLivreur])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
