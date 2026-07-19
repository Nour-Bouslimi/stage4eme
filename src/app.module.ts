/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MissionsModule } from './modules/missions/missions.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { GeolocationModule } from './modules/geolocation/geolocation.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { VehicleSuggestionModule } from './modules/vehicle-suggestion/vehicle-suggestion.module';
import { DriverRecommendationModule } from './modules/driver-recommendation/driver-recommendation.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ← charge le .env partout
    TypeOrmModule.forRoot({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        // Render → utilise l'URL directement
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        // Local → utilise host/port/user/pass
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'nour',
        database: process.env.DB_NAME || 'stage4eme',
      }),
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true,
}),
    CloudinaryModule,
    AuthModule,
    UsersModule,
    MissionsModule,
    ChatModule,
    NotificationsModule,
    RatingsModule,
    GeolocationModule,
    VehicleSuggestionModule,
    DriverRecommendationModule,
    AdminDashboardModule,
  ],
})
export class AppModule {}
