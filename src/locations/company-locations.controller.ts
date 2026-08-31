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
  SetLocationMembersDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

// Локациите обслужват и страницата „Превозни средства" (бусове = Location с
// type VEHICLE, собствено право sites.vehicles — модул „Обекти") — CRUD/екип
// endpoint-ите приемат което и да е от двете права. Складовите зони остават
// само locations.
const anyLocationPerm = (action: 'view' | 'create' | 'edit' | 'delete') =>
  RequireAnyPermission(
    { module: 'warehouse', page: 'locations', action },
    { module: 'sites', page: 'vehicles', action },
  );

@Controller('companies/:companyId/locations')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyLocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==================== LOCATION ENDPOINTS ====================

  @Post()
  @anyLocationPerm('create')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.create(companyId, dto);
  }

  @Get()
  @anyLocationPerm('view')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryLocationsDto,
  ) {
    return this.locationsService.findAll(companyId, query);
  }

  @Get(':id')
  @anyLocationPerm('view')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.locationsService.findOne(companyId, id);
  }

  @Patch(':id')
  @anyLocationPerm('edit')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @anyLocationPerm('delete')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.locationsService.remove(companyId, id);
  }

  // Екип на локацията (бус) — заменя списъка със зачислени служители
  @Patch(':id/members')
  @anyLocationPerm('edit')
  setMembers(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SetLocationMembersDto,
  ) {
    return this.locationsService.setMembers(companyId, id, dto.userIds);
  }

  // ==================== STORAGE ZONE ENDPOINTS ====================

  @Post(':locationId/zones')
  @RequireCreate('warehouse', 'locations')
  createStorageZone(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Body() dto: CreateStorageZoneDto,
  ) {
    return this.locationsService.createStorageZone(companyId, locationId, dto);
  }

  @Get(':locationId/zones')
  @RequireView('warehouse', 'locations')
  findAllStorageZones(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.locationsService.findAllStorageZones(companyId, locationId);
  }

  @Get(':locationId/zones/:zoneId')
  @RequireView('warehouse', 'locations')
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
  @RequireEdit('warehouse', 'locations')
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
  @RequireDelete('warehouse', 'locations')
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
