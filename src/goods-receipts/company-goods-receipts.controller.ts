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
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { DirectDeliveriesService } from './direct-deliveries.service';
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from '../payments/dto';
import {
  CreateGoodsReceiptDto,
  CreateDirectDeliveryDto,
  UpdateDirectDeliveryStatusDto,
  UpdateDirectDeliveryDto,
  SetDirectDeliverySentDto,
  SplitDirectDeliveryDto,
  EnsureDirectDeliveryDto,
  UpdateGoodsReceiptDto,
  QueryGoodsReceiptsDto,
  UpdateGoodsReceiptStatusDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/goods-receipts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyGoodsReceiptsController {
  constructor(
    private readonly goodsReceiptsService: GoodsReceiptsService,
    private readonly paymentsService: PaymentsService,
    private readonly directDeliveries: DirectDeliveriesService,
  ) {}

  @Post()
  @RequireCreate('warehouse', 'goodsReceipts')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.create(companyId, user.id, dto);
  }

  // Директна доставка (drop-ship) към продажба — зад erp.directDelivery, не
  // зад складовите права: създава се и се получава от екрана на поръчката.
  @Post('direct')
  @RequireView('erp', 'directDelivery')
  createDirect(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateDirectDeliveryDto,
  ) {
    return this.goodsReceiptsService.createDirectDelivery(
      companyId,
      user.id,
      dto,
    );
  }

  // Дропшип заявка (Склад > Доставки или екранът на продажбата): складът я
  // обработва с правото за доставки, продавачът я вижда с erp.directDelivery.
  @Post('direct/ensure')
  @RequireAnyPermission(
    { module: 'warehouse', page: 'goodsReceipts', action: 'create' },
    { module: 'erp', page: 'directDelivery', action: 'view' },
  )
  ensureDirect(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: EnsureDirectDeliveryDto,
  ) {
    return this.directDeliveries.ensureForOrder(companyId, dto.orderId, user.id);
  }

  @Patch('direct/:id')
  @RequireAnyPermission(
    { module: 'warehouse', page: 'goodsReceipts', action: 'edit' },
    { module: 'erp', page: 'directDelivery', action: 'view' },
  )
  updateDirect(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDirectDeliveryDto,
  ) {
    return this.directDeliveries.update(companyId, id, dto);
  }

  @Patch('direct/:id/sent')
  @RequireAnyPermission(
    { module: 'warehouse', page: 'goodsReceipts', action: 'edit' },
    { module: 'erp', page: 'directDelivery', action: 'view' },
  )
  setDirectSent(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: SetDirectDeliverySentDto,
  ) {
    return this.directDeliveries.setSent(companyId, id, dto.sent);
  }

  @Post('direct/:id/split')
  @RequireAnyPermission(
    { module: 'warehouse', page: 'goodsReceipts', action: 'edit' },
    { module: 'erp', page: 'directDelivery', action: 'view' },
  )
  splitDirect(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SplitDirectDeliveryDto,
  ) {
    return this.directDeliveries.split(companyId, id, dto.productIds, user.id);
  }

  @Patch('direct/:id/status')
  @RequireAnyPermission(
    { module: 'warehouse', page: 'goodsReceipts', action: 'edit' },
    { module: 'erp', page: 'directDelivery', action: 'view' },
  )
  updateDirectStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDirectDeliveryStatusDto,
  ) {
    return this.goodsReceiptsService.updateDirectDeliveryStatus(
      companyId,
      id,
      dto.status,
      dto.deliveredAt,
    );
  }

  @Get()
  @RequireView('warehouse', 'goodsReceipts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryGoodsReceiptsDto,
  ) {
    return this.goodsReceiptsService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('warehouse', 'goodsReceipts')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('warehouse', 'goodsReceipts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(companyId, id, dto);
  }

  @Patch(':id/status')
  @RequireEdit('warehouse', 'goodsReceipts')
  updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptStatusDto,
  ) {
    return this.goodsReceiptsService.updateStatus(
      companyId,
      id,
      dto.status,
      dto.itemSerials,
      dto.deliveredAt,
      dto.itemBatches,
    );
  }

  @Post(':id/cancel')
  @RequireEdit('warehouse', 'goodsReceipts')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('warehouse', 'goodsReceipts')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.remove(companyId, id);
  }

  // ===== Payments (ledger, mirrors orders) =====

  @Post(':id/payments')
  @RequireEdit('warehouse', 'goodsReceipts')
  addPayment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(companyId, user.id, {
      ...dto,
      orderId: undefined,
      goodsReceiptId: id,
    });
  }

  @Patch(':id/payments/:paymentId')
  @RequireEdit('warehouse', 'goodsReceipts')
  updatePayment(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(companyId, paymentId, dto);
  }

  @Delete(':id/payments/:paymentId')
  @RequireEdit('warehouse', 'goodsReceipts')
  removePayment(
    @Param('companyId') companyId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.remove(companyId, paymentId);
  }
}
