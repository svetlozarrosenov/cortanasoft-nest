import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcceptanceProtocolsService } from './acceptance-protocols.service';
import {
  CreateAcceptanceProtocolDto,
  QueryAcceptanceProtocolsDto,
  UpdateAcceptanceProtocolDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/acceptance-protocols')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyAcceptanceProtocolsController {
  constructor(private readonly service: AcceptanceProtocolsService) {}

  @Post()
  @RequireCreate('erp', 'protocols')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAcceptanceProtocolDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'protocols')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryAcceptanceProtocolsDto,
  ) {
    return this.service.findAll(companyId, query);
  }

  @Get('by-order/:orderId')
  @RequireView('erp', 'protocols')
  findByOrder(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.service.findByOrder(companyId, orderId);
  }

  @Get(':id')
  @RequireView('erp', 'protocols')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'protocols')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAcceptanceProtocolDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'protocols')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'protocols')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.remove(companyId, id);
  }
}
