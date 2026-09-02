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
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireAnyPermission,
  RequireCreate,
  RequireDelete,
  RequireEdit,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/positions')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  // Списъкът трябва и на HR > Служители (селектът за позиция)
  @Get()
  @RequireAnyPermission(
    { module: 'hr', page: 'positions', action: 'view' },
    { module: 'hr', page: 'employees', action: 'view' },
  )
  findAll(
    @Param('companyId') companyId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.positionsService.findAll(companyId, includeInactive === 'true');
  }

  @Get(':id')
  @RequireAnyPermission(
    { module: 'hr', page: 'positions', action: 'view' },
    { module: 'hr', page: 'employees', action: 'view' },
  )
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.positionsService.findOne(companyId, id);
  }

  @Post()
  @RequireCreate('hr', 'positions')
  create(@Param('companyId') companyId: string, @Body() dto: CreatePositionDto) {
    return this.positionsService.create(companyId, dto);
  }

  @Patch(':id')
  @RequireEdit('hr', 'positions')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.positionsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'positions')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.positionsService.remove(companyId, id);
  }
}
