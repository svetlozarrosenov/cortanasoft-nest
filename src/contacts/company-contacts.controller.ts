import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, QueryContactsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/contacts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('crm', 'contacts')
  create(@Param('companyId') companyId: string, @Body() dto: CreateContactDto) {
    return this.contactsService.create(companyId, dto);
  }

  @Get()
  @RequireView('crm', 'contacts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryContactsDto,
  ) {
    return this.contactsService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('crm', 'contacts')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryContactsDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.contactsService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);

    const columns = [
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Position', key: 'position', width: 20 },
      { header: 'Company', key: 'customer.companyName', width: 25 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Contacts');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('by-customer/:customerId')
  @RequireView('crm', 'contacts')
  findByCustomer(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.contactsService.findByCustomer(companyId, customerId);
  }

  @Get(':id')
  @RequireView('crm', 'contacts')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contactsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('crm', 'contacts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('crm', 'contacts')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contactsService.remove(companyId, id);
  }

  @Post(':id/set-primary')
  @RequireEdit('crm', 'contacts')
  setAsPrimary(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contactsService.setAsPrimary(companyId, id);
  }
}
