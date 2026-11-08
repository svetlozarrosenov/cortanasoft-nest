import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PigeonService } from './pigeon.service';
import { UpdatePigeonConfigDto } from './dto/update-pigeon-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

// Настройките на Pigeon ги вижда правото settings.pigeon; формата „Създай
// пратка" (право за продажби) също чете конфигурацията и номенклатурите.
const VIEW_SETTINGS_OR_ORDERS = RequireAnyPermission(
  { module: 'settings', page: 'pigeon', action: 'view' },
  { module: 'erp', page: 'orders', action: 'view' },
);
const VIEW_ORDERS_OR_SHIPMENTS = RequireAnyPermission(
  { module: 'erp', page: 'orders', action: 'view' },
  { module: 'erp', page: 'shipments', action: 'view' },
);

@Controller('companies/:companyId/shipping/pigeon')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class PigeonController {
  constructor(private readonly pigeonService: PigeonService) {}

  @Get('config')
  @VIEW_SETTINGS_OR_ORDERS
  getConfig(@Param('companyId') companyId: string) {
    return this.pigeonService.getConfig(companyId);
  }

  @Patch('config')
  @RequireEdit('settings', 'pigeon')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdatePigeonConfigDto,
  ) {
    return this.pigeonService.updateConfig(companyId, dto);
  }

  @Post('test-connection')
  @RequireEdit('settings', 'pigeon')
  testConnection(@Param('companyId') companyId: string) {
    return this.pigeonService.testConnection(companyId);
  }

  // ---------- Номенклатури ----------

  @Get('cities')
  @VIEW_SETTINGS_OR_ORDERS
  getCities(
    @Param('companyId') companyId: string,
    @Query('name') name?: string,
    @Query('postalCode') postalCode?: string,
  ) {
    return this.pigeonService.getCities(companyId, name, postalCode);
  }

  @Get('cities/:cityId/streets')
  @VIEW_SETTINGS_OR_ORDERS
  getStreets(
    @Param('companyId') companyId: string,
    @Param('cityId') cityId: string,
    @Query('name') name?: string,
  ) {
    return this.pigeonService.getStreets(companyId, Number(cityId), name);
  }

  @Get('offices')
  @VIEW_SETTINGS_OR_ORDERS
  getOffices(
    @Param('companyId') companyId: string,
    @Query('type') type?: 'office' | 'locker',
    @Query('name') name?: string,
    @Query('cityId') cityId?: string,
    @Query('postalCode') postalCode?: string,
  ) {
    return this.pigeonService.getOffices(companyId, {
      type: type === 'office' || type === 'locker' ? type : undefined,
      name,
      cityId: cityId ? Number(cityId) : undefined,
      postalCode,
    });
  }

  @Get('offices/:officeId')
  @VIEW_SETTINGS_OR_ORDERS
  getOffice(
    @Param('companyId') companyId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.pigeonService.getOffice(companyId, Number(officeId));
  }

  @Get('lockers/:code/availability')
  @VIEW_SETTINGS_OR_ORDERS
  getLockerAvailability(
    @Param('companyId') companyId: string,
    @Param('code') code: string,
  ) {
    return this.pigeonService.getLockerAvailability(companyId, code);
  }

  /** Запазените адреси на подателя в профила му при Pigeon. */
  @Get('addresses')
  @VIEW_SETTINGS_OR_ORDERS
  getAddresses(@Param('companyId') companyId: string) {
    return this.pigeonService.getAddresses(companyId);
  }

  @Get('additional-services')
  @VIEW_SETTINGS_OR_ORDERS
  getAdditionalServices(@Param('companyId') companyId: string) {
    return this.pigeonService.getAdditionalServices(companyId);
  }

  @Get('shipment-statuses')
  @VIEW_SETTINGS_OR_ORDERS
  getShipmentStatuses(@Param('companyId') companyId: string) {
    return this.pigeonService.getShipmentStatuses(companyId);
  }

  // ---------- Етикет ----------

  /** PDF на товарителницата (Shipment.pdfUrl сочи насам). */
  @Get('labels/:reference')
  @VIEW_ORDERS_OR_SHIPMENTS
  async getLabel(
    @Param('companyId') companyId: string,
    @Param('reference') reference: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.pigeonService.getLabelByReference(
      companyId,
      reference,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="pigeon-${encodeURIComponent(reference)}.pdf"`,
    });
    return new StreamableFile(pdf);
  }
}
