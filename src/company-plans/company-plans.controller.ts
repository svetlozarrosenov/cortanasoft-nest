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
import { CompanyPlansService } from './company-plans.service';
import {
  CreateCompanyPlanDto,
  UpdateCompanyPlanDto,
  QueryCompanyPlanDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { CompanyPlanStatus } from '@prisma/client';

@Controller('companies/:companyId/plans')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPlansController {
  constructor(private readonly companyPlansService: CompanyPlansService) {}

  // ==================== CRUD Operations ====================

  @Post()
  @RequireCreate('admin', 'companyPlans')
  async create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateCompanyPlanDto,
  ) {
    const plan = await this.companyPlansService.create(companyId, req.user.id, dto);
    return {
      success: true,
      plan,
    };
  }

  @Get()
  @RequireView('admin', 'companyPlans')
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryCompanyPlanDto,
  ) {
    const result = await this.companyPlansService.findAll(companyId, query);
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @RequireView('admin', 'companyPlans')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const plan = await this.companyPlansService.findOne(companyId, id);
    return {
      success: true,
      plan,
    };
  }

  @Patch(':id')
  @RequireEdit('admin', 'companyPlans')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyPlanDto,
  ) {
    const plan = await this.companyPlansService.update(companyId, id, dto);
    return {
      success: true,
      plan,
    };
  }

  @Delete(':id')
  @RequireDelete('admin', 'companyPlans')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const result = await this.companyPlansService.remove(companyId, id);
    return {
      success: true,
      ...result,
    };
  }

  // ==================== Additional Operations ====================

  @Get('by-company/:targetCompanyId')
  @RequireView('admin', 'companyPlans')
  async findByCompany(
    @Param('companyId') companyId: string,
    @Param('targetCompanyId') targetCompanyId: string,
  ) {
    const plans = await this.companyPlansService.findByCompany(companyId, targetCompanyId);
    return {
      success: true,
      plans,
    };
  }

  @Patch(':id/status')
  @RequireEdit('admin', 'companyPlans')
  async updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('status') status: CompanyPlanStatus,
  ) {
    const plan = await this.companyPlansService.updateStatus(companyId, id, status);
    return {
      success: true,
      plan,
    };
  }

  @Post(':id/generate-invoice')
  @RequireCreate('admin', 'companyPlans')
  async generateInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    // First verify admin access
    await this.companyPlansService.findOne(companyId, id);
    const invoice = await this.companyPlansService.generateInvoice(id);
    return {
      success: true,
      invoice,
    };
  }
}
