import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUser } from './entities/app-user.entity.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { MembershipModule } from '../membership/membership.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppUser]), MembershipModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
