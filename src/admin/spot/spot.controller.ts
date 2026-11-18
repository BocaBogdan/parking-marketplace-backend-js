import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminSpotService } from './spot.service.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { UpdateSpotStatusDto } from './dto/update-spot-status.dto.js';
import { Audit } from '../../audit/audit.decorator.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/spot')
export class AdminSpotController {
  constructor(private readonly adminSpotsService: AdminSpotService) {}

  @Audit('spot.review', (_result, request) => ({
    status: (request.body as UpdateSpotStatusDto).status,
  }))
  @Patch(':id/status')
  updateStatus(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpotStatusDto,
  ) {
    return this.adminSpotsService.updateStatus(
      buildingId,
      id,
      dto.status,
      dto.reason,
    );
  }

  @Get()
  getAllByBuildingId(@Param('buildingId') buildingId: string) {
    return this.adminSpotsService.getAllByBuildingId(buildingId);
  }

  @Get(':id')
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.adminSpotsService.findOne(buildingId, id);
  }

  @Get(':id/booking')
  bookings(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.adminSpotsService.bookings(buildingId, id);
  }
}
