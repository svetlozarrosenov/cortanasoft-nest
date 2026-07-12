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
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomersDto,
  TransferReferralsDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireAnyPermission,
  RequireEdit,
  checkPermission,
} from '../common/guards/permissions.guard';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomerStage, CustomerSource } from '@prisma/client';

// Партньорски scope: потребител с UserCompany.partnerCustomerId вижда/пипа
// само своя партньорски картон + доведените от него клиенти. null = пълен
// достъп (обикновен потребител).
const partnerScopeOf = (user: any): string | null =>
  user?.partnerCustomerId ?? null;

// Право за управление на партньорските полета (isPartner / referredById) —
// дава се от Администрация > Компании > Роли > CRM > Партньори (редакция)
const canManagePartnersOf = (user: any): boolean =>
  checkPermission(user?.currentRole?.permissions, 'crm', 'partners', 'edit');

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
    @CurrentUser() user: any,
  ) {
    return this.customersService.create(
      companyId,
      dto,
      partnerScopeOf(user),
      canManagePartnersOf(user),
    );
  }

  // Прехвърляне на клиентите на партньор към друг (при смяна на договор).
  // Историята остава по snapshot-а в поръчките.
  @Post('transfer-referrals')
  @RequireEdit('crm', 'partners')
  transferReferrals(
    @Param('companyId') companyId: string,
    @Body() dto: TransferReferralsDto,
  ) {
    return this.customersService.transferReferrals(companyId, dto);
  }

  @Get()
  @crmCustomersOrLeads('view')
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomersDto,
    @CurrentUser() user: any,
  ) {
    return await this.customersService.findAll(
      companyId,
      query,
      partnerScopeOf(user),
    );
  }

  @Get('export')
  @crmCustomersOrLeads('view')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomersDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: any,
  ) {
    const { data } = await this.customersService.findAll(
      companyId,
      { ...query, page: 1, limit: 100000 } as any,
      partnerScopeOf(user),
    );
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
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.findOne(companyId, id, partnerScopeOf(user));
  }

  @Patch(':id')
  @crmCustomersOrLeads('edit')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.update(
      companyId,
      id,
      dto,
      partnerScopeOf(user),
      canManagePartnersOf(user),
    );
  }

  @Delete(':id')
  @crmCustomersOrLeads('delete')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.remove(companyId, id, partnerScopeOf(user));
  }
}
