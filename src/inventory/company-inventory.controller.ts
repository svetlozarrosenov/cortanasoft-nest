import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireEdit,
} from '../common/guards/permissions.guard';
import { InventoryService } from './inventory.service';
import {
  QueryInventoryDto,
  QueryStockLevelsDto,
  UpdateInventoryBatchDto,
} from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/inventory')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  @RequireView('erp', 'inventory')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryInventoryDto,
  ) {
    return this.inventoryService.findAll(companyId, query);
  }

  @Get('stock-levels')
  @RequireView('erp', 'inventory')
  getStockLevels(
    @Param('companyId') companyId: string,
    @Query() query: QueryStockLevelsDto,
  ) {
    return this.inventoryService.getStockLevels(companyId, query);
  }

  @Get('by-location/:locationId')
  @RequireView('erp', 'inventory')
  getByLocation(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Query() query: QueryInventoryDto,
  ) {
    return this.inventoryService.getByLocation(companyId, locationId, query);
  }

  @Get('by-product/:productId')
  @RequireView('erp', 'inventory')
  getByProduct(
    @Param('companyId') companyId: string,
    @Param('productId') productId: string,
    @Query() query: QueryInventoryDto,
  ) {
    return this.inventoryService.getByProduct(companyId, productId, query);
  }

  @Get('by-receipt/:goodsReceiptId')
  @RequireView('erp', 'inventory')
  getByGoodsReceipt(
    @Param('companyId') companyId: string,
    @Param('goodsReceiptId') goodsReceiptId: string,
  ) {
    return this.inventoryService.getByGoodsReceipt(companyId, goodsReceiptId);
  }

  @Get('export')
  @RequireView('erp', 'inventory')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryInventoryDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.inventoryService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Product', key: 'product.name', width: 25 },
      { header: 'SKU', key: 'product.sku', width: 15 },
      { header: 'Location', key: 'location.name', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Batch Number', key: 'batchNumber', width: 15 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Unit Cost', key: 'unitCost', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Inventory');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'inventory')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.inventoryService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'inventory')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryBatchDto,
  ) {
    return this.inventoryService.update(companyId, id, dto);
  }
}
