import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity.js';
import { BuildingFeatureFlag } from './entities/building-feature-flag.entity.js';
import { FeatureFlagService } from './feature-flag.service.js';
import { FeatureFlagController } from './feature-flag.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag, BuildingFeatureFlag])],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}
