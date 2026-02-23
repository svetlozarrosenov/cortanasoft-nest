import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
  CreateStorageZoneDto,
  UpdateStorageZoneDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/locations')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyLocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==================== LOCATION ENDPOINTS ====================

  @Post()
  @RequireCreate('erp', 'locations')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'locations')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryLocationsDto,
  ) {
    return this.locationsService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'locations')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.locationsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'locations')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'locations')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.locationsService.remove(companyId, id);
  }

  // ==================== STORAGE ZONE ENDPOINTS ====================

  @Post(':locationId/zones')
  @RequireCreate('erp', 'locations')
  createStorageZone(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Body() dto: CreateStorageZoneDto,
  ) {
    return this.locationsService.createStorageZone(companyId, locationId, dto);
  }

  @Get(':locationId/zones')
  @RequireView('erp', 'locations')
  findAllStorageZones(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.locationsService.findAllStorageZones(companyId, locationId);
  }

  @Get(':locationId/zones/:zoneId')
  @RequireView('erp', 'locations')
  findOneStorageZone(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.locationsService.findOneStorageZone(
      companyId,
      locationId,
      zoneId,
    );
  }

  @Patch(':locationId/zones/:zoneId')
  @RequireEdit('erp', 'locations')
  updateStorageZone(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateStorageZoneDto,
  ) {
    return this.locationsService.updateStorageZone(
      companyId,
      locationId,
      zoneId,
      dto,
    );
  }

  @Delete(':locationId/zones/:zoneId')
  @RequireDelete('erp', 'locations')
  removeStorageZone(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.locationsService.removeStorageZone(
      companyId,
      locationId,
      zoneId,
    );
  }
}
