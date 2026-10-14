import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
  UpdateOfferStatusDto,
  QueryOffersDto,
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

@Controller('companies/:companyId/offers')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @RequireCreate('erp', 'offers')
  create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(companyId, req.user.id, dto);
  }

  @Get()
  @RequireView('erp', 'offers')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryOffersDto,
  ) {
    return this.offersService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'offers')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.offersService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'offers')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(companyId, id, dto);
  }

  @Patch(':id/status')
  @RequireEdit('erp', 'offers')
  updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOfferStatusDto,
  ) {
    return this.offersService.updateStatus(companyId, id, dto.status);
  }

  @Delete(':id')
  @RequireDelete('erp', 'offers')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.offersService.remove(companyId, id);
  }
}
