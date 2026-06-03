import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { EmployeeRecordNotificationsService } from './employee-record-notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
} from '../common/guards/permissions.guard';

// Генерични endpoint-и за уведомяване / потвърждаване на получаване,
// важащи за всички видове трудови документи (наредба ПМС 71/2018).
@Controller('companies/:companyId/employee-records/:entityType/:entityId')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmployeeRecordNotificationsController {
  constructor(private readonly service: EmployeeRecordNotificationsService) {}

  @Post('notify')
  @RequireEdit('hr', 'employeeRecords')
  notify(
    @Param('companyId') companyId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.notify(companyId, entityType, entityId);
  }

  @Post('confirm-delivery')
  @RequireEdit('hr', 'employeeRecords')
  confirmDelivery(
    @Param('companyId') companyId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.confirmDelivery(companyId, entityType, entityId);
  }
}
