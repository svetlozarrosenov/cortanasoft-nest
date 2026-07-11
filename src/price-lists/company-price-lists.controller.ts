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
import { PriceListsService } from './price-lists.service';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  UpsertPriceListItemDto,
  AssignCustomerDto,
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

@Controller('companies/:companyId/price-lists')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @RequireCreate('erp', 'priceLists')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePriceListDto,
  ) {
    return this.priceListsService.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'priceLists')
  findAll(@Param('companyId') companyId: string) {
    return this.priceListsService.findAll(companyId);
  }

  // Ефективни цени за клиент — ползва се от формата за продажба, затова се
  // гейтва с права за продажби, не за ценови листи: продавач без достъп до
  // модула Ценови листи пак трябва да получава договорените дефолтни цени.
  @Get('effective')
  @RequireView('erp', 'orders')
  getEffectivePrices(
    @Param('companyId') companyId: string,
    @Query('customerId') customerId: string,
  ) {
    return this.priceListsService.getEffectivePrices(companyId, customerId);
  }

  @Get(':id')
  @RequireView('erp', 'priceLists')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.priceListsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'priceLists')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.priceListsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'priceLists')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.priceListsService.remove(companyId, id);
  }

  @Post(':id/items')
  @RequireEdit('erp', 'priceLists')
  upsertItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpsertPriceListItemDto,
  ) {
    return this.priceListsService.upsertItem(companyId, id, dto);
  }

  @Delete(':id/items/:itemId')
  @RequireEdit('erp', 'priceLists')
  removeItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.priceListsService.removeItem(companyId, id, itemId);
  }

  @Post(':id/customers')
  @RequireEdit('erp', 'priceLists')
  assignCustomer(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AssignCustomerDto,
  ) {
    return this.priceListsService.assignCustomer(companyId, id, dto.customerId);
  }

  @Delete(':id/customers/:customerId')
  @RequireEdit('erp', 'priceLists')
  unassignCustomer(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
  ) {
    return this.priceListsService.unassignCustomer(companyId, id, customerId);
  }
}
