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
import { AscertainmentProtocolsService } from './ascertainment-protocols.service';
import {
  CreateAscertainmentProtocolDto,
  QueryAscertainmentProtocolsDto,
  UpdateAscertainmentProtocolDto,
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

@Controller('companies/:companyId/ascertainment-protocols')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyAscertainmentProtocolsController {
  constructor(private readonly service: AscertainmentProtocolsService) {}

  @Post()
  @RequireCreate('erp', 'protocols')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateAscertainmentProtocolDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'protocols')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryAscertainmentProtocolsDto,
  ) {
    return this.service.findAll(companyId, query);
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
    @Body() dto: UpdateAscertainmentProtocolDto,
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
