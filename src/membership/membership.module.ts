import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingMembership } from './entities/building-membership.entity.js';
import { BuildingInvite } from './entities/building-invite.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingMembership, BuildingInvite])],
  exports: [TypeOrmModule],
})
export class MembershipModule {}
