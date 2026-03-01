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
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  QueryGoodsReceiptsDto,
  ConfirmGoodsReceiptDto,
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
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @RequireCreate('erp', 'goodsReceipts')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'goodsReceipts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryGoodsReceiptsDto,
  ) {
    return this.goodsReceiptsService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'goodsReceipts')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'goodsReceipts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(companyId, id, dto);
  }

  @Post(':id/confirm')
  @RequireEdit('erp', 'goodsReceipts')
  confirm(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.confirm(companyId, id, dto.itemSerials);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'goodsReceipts')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'goodsReceipts')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.goodsReceiptsService.remove(companyId, id);
  }
}
