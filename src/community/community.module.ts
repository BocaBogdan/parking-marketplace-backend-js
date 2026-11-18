import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from './entities/community.entity.js';
import { Building } from '../building/entities/building.entity.js';
import { CommunityService } from './community.service.js';
import { CommunityController } from './community.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Community, Building])],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
