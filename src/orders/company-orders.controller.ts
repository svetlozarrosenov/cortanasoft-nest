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
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, QueryOrdersDto } from './dto';
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

@Controller('companies/:companyId/orders')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'orders')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'orders')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'orders')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryOrdersDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.ordersService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'VAT Amount', key: 'vatAmount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Orders');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'orders')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ordersService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'orders')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(companyId, id, dto);
  }

  @Post(':id/confirm')
  @RequireEdit('erp', 'orders')
  confirm(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ordersService.confirm(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'orders')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ordersService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'orders')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ordersService.remove(companyId, id);
  }
}
