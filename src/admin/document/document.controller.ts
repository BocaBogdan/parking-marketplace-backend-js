import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../decorators/roles.decorator.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get(':docId')
  getDocumentById(@Param('docId') docId: string) {
    return this.documentService.getByDocumentId(docId);
  }
}
