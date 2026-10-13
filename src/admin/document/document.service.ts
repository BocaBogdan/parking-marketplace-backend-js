import { Injectable } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service.js';

@Injectable()
export class DocumentService {
  constructor(private readonly storage: StorageService) {}

  getByDocumentId(id: string) {
    return this.storage.getSignedUrl(id);
  }
}
