import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { AdminCarService } from './car.service.js';
import { AdminCarQueryDto } from './dto/car-query.dto.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/car')
export class AdminCarController {
  constructor(private readonly adminCarService: AdminCarService) {}

  /** The building's cars, searched, sorted and paginated */
  @Get()
  findByBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Query() query: AdminCarQueryDto,
  ) {
    return this.adminCarService.findByBuilding(buildingId, query);
  }
}
