import { Module } from '@nestjs/common';
import { AdminSpotService } from './spot.service.js';
import { AdminSpotController } from './spot.controller.js';
import { SpotModule } from '../../spot/spot.module.js';
import { StorageModule } from '../../storage/storage.module.js';

@Module({
  imports: [SpotModule, StorageModule],
  controllers: [AdminSpotController],
  providers: [AdminSpotService],
})
export class AdminSpotModule {}
