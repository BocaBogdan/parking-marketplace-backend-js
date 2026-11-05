import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mailConfig } from './mail.config.js';
import { MailService } from './mail.service.js';

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
