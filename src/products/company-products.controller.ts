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
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
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

@Controller('companies/:companyId/products')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'products')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'products')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'products')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryProductsDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.productsService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Category', key: 'category.name', width: 20 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Sale Price', key: 'salePrice', width: 15 },
      { header: 'VAT Rate %', key: 'vatRate', width: 10 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Products');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('categories')
  @RequireView('erp', 'products')
  findAllCategories(@Param('companyId') companyId: string) {
    return this.productsService.findAllCategories(companyId);
  }

  @Post('categories')
  @RequireCreate('erp', 'products')
  createCategory(
    @Param('companyId') companyId: string,
    @Body() data: { name: string; description?: string; parentId?: string },
  ) {
    return this.productsService.createCategory(companyId, data);
  }

  @Patch('categories/:id')
  @RequireEdit('erp', 'products')
  updateCategory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; parentId?: string },
  ) {
    return this.productsService.updateCategory(companyId, id, data);
  }

  @Delete('categories/:id')
  @RequireDelete('erp', 'products')
  removeCategory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.removeCategory(companyId, id);
  }

  @Get(':id')
  @RequireView('erp', 'products')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'products')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'products')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.productsService.remove(companyId, id);
  }
}
