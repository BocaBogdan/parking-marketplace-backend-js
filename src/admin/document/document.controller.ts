import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get(':docId')
  getDocumentById(
    @Param('buildingId') buildingId: string,
    @Param('docId') docId: string,
  ) {
    return this.documentService.getByDocumentId(buildingId, docId);
  }
}
