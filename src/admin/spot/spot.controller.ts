import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminSpotService } from './spot.service.js';
import { Roles } from '../../decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { UpdateSpotDto } from '../../spot/dto/update-spot.dto.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/:buildingId/spot')
export class AdminSpotController {
  constructor(private readonly adminSpotsService: AdminSpotService) {}

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSpotDto) {
    return this.adminSpotsService.updateStatus(id, dto.status);
  }

  @Get()
  getAllByBuildingId(@Param('buildingId') buildingId: string) {
    return this.adminSpotsService.getAllByBuildingId(buildingId);
  }
}
