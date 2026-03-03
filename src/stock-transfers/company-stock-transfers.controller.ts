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
import { StockTransfersService } from './stock-transfers.service';
import {
  CreateStockTransferDto,
  UpdateStockTransferDto,
  QueryStockTransfersDto,
  ReceiveStockTransferDto,
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

@Controller('companies/:companyId/stock-transfers')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyStockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Post()
  @RequireCreate('warehouse', 'stockTransfers')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateStockTransferDto,
  ) {
    return this.stockTransfersService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('warehouse', 'stockTransfers')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryStockTransfersDto,
  ) {
    return this.stockTransfersService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('warehouse', 'stockTransfers')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockTransfersService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('warehouse', 'stockTransfers')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockTransferDto,
  ) {
    return this.stockTransfersService.update(companyId, id, dto);
  }

  @Post(':id/ship')
  @RequireEdit('warehouse', 'stockTransfers')
  ship(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockTransfersService.ship(companyId, id);
  }

  @Post(':id/receive')
  @RequireEdit('warehouse', 'stockTransfers')
  receive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveStockTransferDto,
  ) {
    return this.stockTransfersService.receive(companyId, id, dto);
  }

  @Post(':id/cancel')
  @RequireEdit('warehouse', 'stockTransfers')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockTransfersService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('warehouse', 'stockTransfers')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockTransfersService.remove(companyId, id);
  }
}
