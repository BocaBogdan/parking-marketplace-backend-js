import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUser } from '../user/entities/app-user.entity.js';
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';
import { AccessService } from './access.service.js';

/** Global, so AuthGuard can load access in whichever module it guards */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AppUser, BuildingMembership])],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
