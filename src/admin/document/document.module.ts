import { Module } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { DocumentController } from './document.controller.js';
import { SpotModule } from '../../spot/spot.module.js';
import { StorageModule } from '../../storage/storage.module.js';

@Module({
  imports: [SpotModule, StorageModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
