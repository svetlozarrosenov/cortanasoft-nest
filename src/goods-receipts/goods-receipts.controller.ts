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
  UpdateGoodsReceiptStatusDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtCompanyGuard } from '../common/guards/jwt-company.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('goods-receipts')
@UseGuards(JwtAuthGuard, JwtCompanyGuard, PermissionsGuard)
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @RequireCreate('warehouse', 'goodsReceipts')
  create(@CurrentUser() user: any, @Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(
      user.currentCompany.id,
      user.id,
      dto,
    );
  }

  @Get()
  @RequireView('warehouse', 'goodsReceipts')
  findAll(@CurrentUser() user: any, @Query() query: QueryGoodsReceiptsDto) {
    return this.goodsReceiptsService.findAll(user.currentCompany.id, query);
  }

  @Get(':id')
  @RequireView('warehouse', 'goodsReceipts')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.findOne(user.currentCompany.id, id);
  }

  @Patch(':id')
  @RequireEdit('warehouse', 'goodsReceipts')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(user.currentCompany.id, id, dto);
  }

  @Patch(':id/status')
  @RequireEdit('warehouse', 'goodsReceipts')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptStatusDto,
  ) {
    return this.goodsReceiptsService.updateStatus(
      user.currentCompany.id,
      id,
      dto.status,
      dto.itemSerials,
    );
  }

  @Post(':id/cancel')
  @RequireEdit('warehouse', 'goodsReceipts')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.cancel(user.currentCompany.id, id);
  }

  @Delete(':id')
  @RequireDelete('warehouse', 'goodsReceipts')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.remove(user.currentCompany.id, id);
  }
}
