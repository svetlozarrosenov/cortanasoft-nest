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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
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
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/purchase-orders')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'purchaseOrders')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'purchaseOrders')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryPurchaseOrdersDto,
  ) {
    return this.purchaseOrdersService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'purchaseOrders')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryPurchaseOrdersDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.purchaseOrdersService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Supplier', key: 'supplier.name', width: 25 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'PurchaseOrders');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="purchase-orders-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'purchaseOrders')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.findOne(companyId, id);
  }

  @Get(':id/pending-items')
  @RequireView('erp', 'purchaseOrders')
  getPendingItems(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrdersService.getPendingItems(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'purchaseOrders')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(companyId, id, dto);
  }

  @Post(':id/send')
  @RequireEdit('erp', 'purchaseOrders')
  send(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.send(companyId, id);
  }

  @Post(':id/confirm')
  @RequireEdit('erp', 'purchaseOrders')
  confirm(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.confirm(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'purchaseOrders')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'purchaseOrders')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.remove(companyId, id);
  }
}
