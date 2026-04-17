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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, QueryPaymentsDto } from './dto';
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

@Controller('companies/:companyId/payments')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequireView('erp', 'orders')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryPaymentsDto,
  ) {
    return this.paymentsService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'orders')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(companyId, id);
  }

  @Post()
  @RequireCreate('erp', 'orders')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(companyId, user.id, dto);
  }

  @Patch(':id')
  @RequireEdit('erp', 'orders')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'orders')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.paymentsService.remove(companyId, id);
  }
}
