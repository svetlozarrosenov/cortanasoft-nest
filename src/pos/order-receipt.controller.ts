import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
} from '../common/guards/permissions.guard';

// The fiscal receipt a sale was printed with, for whoever can see the sale.
// It needs no access to the point of sale itself.
@Controller('companies/:companyId/orders/:orderId/fiscal-receipt')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class OrderReceiptController {
  constructor(private pos: PosService) {}

  @Get()
  @RequireView('erp', 'orders')
  async receipt(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return { receipt: await this.pos.orderReceipt(companyId, orderId) };
  }
}
