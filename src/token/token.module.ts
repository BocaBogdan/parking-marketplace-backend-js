import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './token.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Token])],
  exports: [TypeOrmModule],
})
export class TokenModule {}
