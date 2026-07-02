import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { EmployeeRecordNotificationsService } from './employee-record-notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Генерични endpoint-и за уведомяване / потвърждаване на получаване,
// важащи за всички видове трудови документи (наредба ПМС 71/2018).
// Уведомяването реално известява служителя (push + имейл); потвърждаването
// тук е РЪЧНОТО отбелязване от HR (напр. хартиено връчване) — служителят
// потвърждава сам през /my-dossier/confirm.
@Controller('companies/:companyId/employee-records/:entityType/:entityId')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmployeeRecordNotificationsController {
  constructor(private readonly service: EmployeeRecordNotificationsService) {}

  @Post('notify')
  @RequireEdit('employeeRecords', 'dossiers')
  notify(
    @Param('companyId') companyId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.notify(companyId, entityType, entityId, {
      id: user.id,
      email: user.email,
    });
  }

  @Post('confirm-delivery')
  @RequireEdit('employeeRecords', 'dossiers')
  confirmDelivery(
    @Param('companyId') companyId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.confirmDelivery(companyId, entityType, entityId, {
      id: user.id,
      email: user.email,
    });
  }
}
