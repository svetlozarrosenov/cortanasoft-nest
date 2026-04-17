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
import { ProductionService } from './production.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  QueryProductionOrdersDto,
  IssueMaterialDto,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/production')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @RequireCreate('production', 'orders')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductionOrderDto,
  ) {
    return this.productionService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('production', 'orders')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryProductionOrdersDto,
  ) {
    return this.productionService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('production', 'orders')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.findOne(companyId, id);
  }

  @Get(':id/planned-materials')
  @RequireView('production', 'orders')
  plannedMaterials(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.productionService.getPlannedMaterials(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('production', 'orders')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionService.update(companyId, id, dto);
  }

  @Post(':id/start')
  @RequireEdit('production', 'orders')
  start(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.productionService.start(companyId, id, user.id);
  }

  @Post(':id/issue-material')
  @RequireEdit('production', 'orders')
  issueMaterial(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: IssueMaterialDto,
  ) {
    return this.productionService.issueMaterial(companyId, id, user.id, dto);
  }

  @Post('issuances/:issuanceId/return')
  @RequireEdit('production', 'orders')
  returnMaterial(
    @Param('companyId') companyId: string,
    @Param('issuanceId') issuanceId: string,
  ) {
    return this.productionService.returnMaterial(companyId, issuanceId);
  }

  @Post(':id/complete')
  @RequireEdit('production', 'orders')
  complete(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.complete(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('production', 'orders')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('production', 'orders')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.remove(companyId, id);
  }
}
