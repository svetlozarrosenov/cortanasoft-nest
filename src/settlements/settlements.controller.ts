import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SettlementType } from '@prisma/client';

@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  async findAll(
    @Query('countryId') countryId?: string,
    @Query('region') region?: string,
    @Query('municipality') municipality?: string,
    @Query('type') type?: SettlementType,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: string,
  ) {
    return this.settlementsService.findAll({
      countryId,
      region,
      municipality,
      type,
      search,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('regions/:countryId')
  async getRegions(@Param('countryId') countryId: string) {
    return this.settlementsService.getRegions(countryId);
  }

  @Get('municipalities/:countryId')
  async getMunicipalities(
    @Param('countryId') countryId: string,
    @Query('region') region?: string,
  ) {
    return this.settlementsService.getMunicipalities(countryId, region);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.settlementsService.findOne(id);
  }
}
