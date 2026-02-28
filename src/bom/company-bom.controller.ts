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
import { BOMService } from './bom.service';
import { CreateBOMDto, UpdateBOMDto, QueryBOMDto } from './dto';
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

@Controller('companies/:companyId/bom')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyBOMController {
  constructor(private readonly bomService: BOMService) {}

  @Post()
  @RequireCreate('production', 'bom')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateBOMDto,
  ) {
    return this.bomService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('production', 'bom')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryBOMDto,
  ) {
    return this.bomService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('production', 'bom')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.bomService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('production', 'bom')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBOMDto,
  ) {
    return this.bomService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('production', 'bom')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.bomService.remove(companyId, id);
  }
}
