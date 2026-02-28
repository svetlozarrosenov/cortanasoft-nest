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
  @RequireCreate('erp', 'production')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductionOrderDto,
  ) {
    return this.productionService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'production')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryProductionOrdersDto,
  ) {
    return this.productionService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'production')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'production')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
  ) {
    return this.productionService.update(companyId, id, dto);
  }

  @Post(':id/start')
  @RequireEdit('erp', 'production')
  start(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.start(companyId, id);
  }

  @Post(':id/complete')
  @RequireEdit('erp', 'production')
  complete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body?: { materials?: { productId: string; actualQuantity: number }[] },
  ) {
    return this.productionService.complete(companyId, id, body?.materials);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'production')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'production')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productionService.remove(companyId, id);
  }
}
