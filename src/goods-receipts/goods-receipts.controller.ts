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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('goods-receipts')
@UseGuards(JwtAuthGuard)
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(
      user.currentCompany.id,
      user.id,
      dto,
    );
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryGoodsReceiptsDto) {
    return this.goodsReceiptsService.findAll(user.currentCompany.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.findOne(user.currentCompany.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(user.currentCompany.id, id, dto);
  }

  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ConfirmGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.confirm(
      user.currentCompany.id,
      id,
      dto.itemSerials,
    );
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.cancel(user.currentCompany.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goodsReceiptsService.remove(user.currentCompany.id, id);
  }
}
