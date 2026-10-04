import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomerContactsService } from './customer-contacts.service';
import { CreateCustomerContactDto, UpdateCustomerContactDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface ScopedUser {
  partnerCustomerId?: string | null;
}

// Права: същите като на самия клиент — Клиенти (crm.customers) или Лийдове
// (crm.contacts); няма отделно право за лицата за контакт.
@Controller('companies/:companyId/customers/:customerId/contacts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyCustomerContactsController {
  constructor(private contacts: CustomerContactsService) {}

  @Get()
  @RequireAnyPermission(
    { module: 'crm', page: 'customers', action: 'view' },
    { module: 'crm', page: 'contacts', action: 'view' },
  )
  findAll(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @CurrentUser() user: ScopedUser,
  ) {
    return this.contacts.findAll(companyId, customerId, user.partnerCustomerId);
  }

  @Post()
  @RequireAnyPermission(
    { module: 'crm', page: 'customers', action: 'edit' },
    { module: 'crm', page: 'contacts', action: 'edit' },
  )
  create(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerContactDto,
    @CurrentUser() user: ScopedUser,
  ) {
    return this.contacts.create(
      companyId,
      customerId,
      dto,
      user.partnerCustomerId,
    );
  }

  @Patch(':id')
  @RequireAnyPermission(
    { module: 'crm', page: 'customers', action: 'edit' },
    { module: 'crm', page: 'contacts', action: 'edit' },
  )
  update(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerContactDto,
    @CurrentUser() user: ScopedUser,
  ) {
    return this.contacts.update(
      companyId,
      customerId,
      id,
      dto,
      user.partnerCustomerId,
    );
  }

  @Delete(':id')
  @RequireAnyPermission(
    { module: 'crm', page: 'customers', action: 'edit' },
    { module: 'crm', page: 'contacts', action: 'edit' },
  )
  remove(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @CurrentUser() user: ScopedUser,
  ) {
    return this.contacts.remove(
      companyId,
      customerId,
      id,
      user.partnerCustomerId,
    );
  }
}
