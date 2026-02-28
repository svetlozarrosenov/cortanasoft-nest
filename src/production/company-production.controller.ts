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
  start(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.start(companyId, id);
  }

  @Post(':id/complete')
  @RequireEdit('production', 'orders')
  complete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body?: { materials?: { productId: string; actualQuantity: number }[] },
  ) {
    return this.productionService.complete(companyId, id, body?.materials);
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
