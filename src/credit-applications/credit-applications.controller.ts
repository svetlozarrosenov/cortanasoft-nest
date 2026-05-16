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
import { CreditApplicationsService } from './credit-applications.service';
import {
  CreateCreditApplicationDto,
  UpdateCreditApplicationDto,
  QueryCreditApplicationsDto,
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

@Controller('companies/:companyId/credit-applications')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CreditApplicationsController {
  constructor(private readonly service: CreditApplicationsService) {}

  @Post()
  @RequireCreate('erp', 'credits')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCreditApplicationDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'credits')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryCreditApplicationsDto,
  ) {
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'credits')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'credits')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditApplicationDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'credits')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
