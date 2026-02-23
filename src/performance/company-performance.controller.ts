import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';
import {
  CreatePerformanceReviewDto,
  UpdatePerformanceReviewDto,
  QueryPerformanceReviewDto,
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

@Controller('companies/:companyId/performance')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // ==================== Performance Reviews ====================

  @Post()
  @RequireCreate('hr', 'performance')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePerformanceReviewDto,
  ) {
    return this.performanceService.create(companyId, dto);
  }

  @Get()
  @RequireView('hr', 'performance')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryPerformanceReviewDto,
  ) {
    return this.performanceService.findAll(companyId, query);
  }

  @Get('summary')
  @RequireView('hr', 'performance')
  getSummary(
    @Param('companyId') companyId: string,
    @Query('year') year?: string,
  ) {
    return this.performanceService.getSummary(
      companyId,
      year ? parseInt(year) : undefined,
    );
  }

  @Get(':id')
  @RequireView('hr', 'performance')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.performanceService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('hr', 'performance')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceReviewDto,
  ) {
    return this.performanceService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'performance')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.performanceService.remove(companyId, id);
  }

  // ==================== Workflow Actions ====================

  @Post(':id/submit')
  @RequireEdit('hr', 'performance')
  submitForReview(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.performanceService.submitForReview(companyId, id);
  }

  @Post(':id/start')
  @RequireEdit('hr', 'performance')
  startReview(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.performanceService.startReview(companyId, id);
  }

  @Post(':id/complete')
  @RequireEdit('hr', 'performance')
  complete(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.performanceService.complete(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('hr', 'performance')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.performanceService.cancel(companyId, id);
  }
}
