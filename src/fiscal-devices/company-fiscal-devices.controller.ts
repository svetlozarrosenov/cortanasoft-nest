import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FiscalDevicesService } from './fiscal-devices.service';
import { CreatePairingCodeDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Settings > Fiscal devices: which cash registers may work with the company
@Controller('companies/:companyId/fiscal-devices')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyFiscalDevicesController {
  constructor(private devices: FiscalDevicesService) {}

  @Get()
  @RequireView('settings', 'fiscalDevices')
  findAll(@Param('companyId') companyId: string) {
    return this.devices.findAll(companyId);
  }

  @Post('pairing-codes')
  @RequireCreate('settings', 'fiscalDevices')
  createPairingCode(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePairingCodeDto,
  ) {
    return this.devices.createPairingCode(companyId, user.id, dto);
  }

  @Post(':id/revoke')
  @RequireDelete('settings', 'fiscalDevices')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.devices.revoke(companyId, id);
  }
}
