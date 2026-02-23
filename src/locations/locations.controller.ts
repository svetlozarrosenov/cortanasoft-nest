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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==================== LOCATION ENDPOINTS ====================

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(user.currentCompany.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryLocationsDto) {
    return this.locationsService.findAll(user.currentCompany.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.locationsService.findOne(user.currentCompany.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.currentCompany.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.locationsService.remove(user.currentCompany.id, id);
  }

  // ==================== STORAGE ZONE ENDPOINTS ====================

  @Post(':locationId/zones')
  createStorageZone(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Body() dto: CreateStorageZoneDto,
  ) {
    return this.locationsService.createStorageZone(
      user.currentCompany.id,
      locationId,
      dto,
    );
  }

  @Get(':locationId/zones')
  findAllStorageZones(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    return this.locationsService.findAllStorageZones(
      user.currentCompany.id,
      locationId,
    );
  }

  @Get(':locationId/zones/:zoneId')
  findOneStorageZone(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.locationsService.findOneStorageZone(
      user.currentCompany.id,
      locationId,
      zoneId,
    );
  }

  @Patch(':locationId/zones/:zoneId')
  updateStorageZone(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateStorageZoneDto,
  ) {
    return this.locationsService.updateStorageZone(
      user.currentCompany.id,
      locationId,
      zoneId,
      dto,
    );
  }

  @Delete(':locationId/zones/:zoneId')
  removeStorageZone(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.locationsService.removeStorageZone(
      user.currentCompany.id,
      locationId,
      zoneId,
    );
  }
}
