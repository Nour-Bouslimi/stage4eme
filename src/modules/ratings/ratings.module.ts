import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notation } from './entities/notation.entity';
import { MissionsModule } from '../missions/missions.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notation]), MissionsModule, UsersModule, NotificationsModule],
  providers: [RatingsService],
  controllers: [RatingsController],
})
export class RatingsModule {}
