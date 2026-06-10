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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { CustomerStage, CustomerSource } from '@prisma/client';

// Customers and Leads are the same entity (leads = customers with stage LEAD)
// served by these endpoints. Allow either the 'customers' or the 'contacts'
// (= Leads) permission, so a leads-only role can use them too. The frontend
// decides which menu (Customers / Leads) is shown per permission.
const crmCustomersOrLeads = (action: 'view' | 'create' | 'edit' | 'delete') =>
  RequireAnyPermission(
    { module: 'crm', page: 'customers', action },
    { module: 'crm', page: 'contacts', action },
  );

@Controller('companies/:companyId/customers')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyCustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @crmCustomersOrLeads('create')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(companyId, dto);
  }

  @Get()
  @crmCustomersOrLeads('view')
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomersDto,
  ) {
    return await this.customersService.findAll(companyId, query);
  }

  @Get('export')
  @crmCustomersOrLeads('view')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomersDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.customersService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'EIK', key: 'eik', width: 15 },
      { header: 'VAT Number', key: 'vatNumber', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Stage', key: 'stage', width: 12 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Customers');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('stages')
  @crmCustomersOrLeads('view')
  getStages() {
    return Object.values(CustomerStage);
  }

  @Get('sources')
  @crmCustomersOrLeads('view')
  getSources() {
    return Object.values(CustomerSource);
  }

  @Get(':id')
  @crmCustomersOrLeads('view')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.findOne(companyId, id);
  }

  @Patch(':id')
  @crmCustomersOrLeads('edit')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(companyId, id, dto);
  }

  @Delete(':id')
  @crmCustomersOrLeads('delete')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.remove(companyId, id);
  }
}
