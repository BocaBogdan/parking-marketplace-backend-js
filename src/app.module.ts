import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminModule } from './admin/admin.module.js';
import { SpotModule } from './spot/spot.module.js';
import { BuildingModule } from './building/building.module.js';
import { BookingModule } from './booking/booking.module.js';
import { CarModule } from './car/car.module.js';
import { StorageModule } from './storage/storage.module.js';
import { UserModule } from './user/user.module.js';
import { FeatureFlagModule } from './feature-flag/feature-flag.module.js';
import { AccessModule } from './auth/access.module.js';
import { CommunityModule } from './community/community.module.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  RATE_LIMIT,
  UserThrottlerGuard,
} from './common/user-throttler.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([RATE_LIMIT]),
    DatabaseModule,
    AccessModule,
    AdminModule,
    SpotModule,
    BuildingModule,
    BookingModule,
    CarModule,
    StorageModule,
    UserModule,
    FeatureFlagModule,
    CommunityModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: UserThrottlerGuard }],
})
export class AppModule {}
