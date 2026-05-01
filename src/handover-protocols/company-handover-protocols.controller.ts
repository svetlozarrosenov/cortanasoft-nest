import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HandoverProtocolsService } from './handover-protocols.service';
import {
  CreateHandoverProtocolDto,
  QueryHandoverProtocolsDto,
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

@Controller('companies/:companyId/handover-protocols')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyHandoverProtocolsController {
  constructor(private readonly service: HandoverProtocolsService) {}

  @Post()
  @RequireCreate('erp', 'handoverProtocols')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateHandoverProtocolDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'handoverProtocols')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryHandoverProtocolsDto,
  ) {
    return this.service.findAll(companyId, query);
  }

  @Get('by-order/:orderId')
  @RequireView('erp', 'handoverProtocols')
  findByOrder(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.service.findByOrder(companyId, orderId);
  }

  @Get(':id')
  @RequireView('erp', 'handoverProtocols')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.findOne(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'handoverProtocols')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'handoverProtocols')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.remove(companyId, id);
  }
}
