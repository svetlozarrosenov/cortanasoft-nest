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
import { PaymentsService } from '../payments/payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from '../payments/dto';
import {
  CreateGoodsReceiptDto,
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
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/goods-receipts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyGoodsReceiptsController {
  constructor(
    private readonly goodsReceiptsService: GoodsReceiptsService,
    private readonly paymentsService: PaymentsService,
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
