import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notation } from './entities/notation.entity';
import { MissionsModule } from '../missions/missions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notation]), MissionsModule, UsersModule],
  providers: [RatingsService],
  controllers: [RatingsController],
})
export class RatingsModule {}
