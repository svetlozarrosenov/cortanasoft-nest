import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { LeavesService } from './leaves.service';
import {
  CreateLeaveDto,
  UpdateLeaveDto,
  QueryLeavesDto,
  RejectLeaveDto,
} from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/leaves')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyLeavesController {
  constructor(
    private leavesService: LeavesService,
    private readonly exportService: ExportService,
  ) {}

  // Create a new leave request
  @Post()
  @RequireCreate('hr', 'leaves')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLeaveDto,
    @Request() req: any,
  ) {
    return this.leavesService.create(companyId, req.user.id, dto);
  }

  // Get all leaves
  @Get()
  @RequireView('hr', 'leaves')
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryLeavesDto,
  ) {
    return this.leavesService.findAll(companyId, query);
  }

  // Get summary stats
  @Get('summary')
  @RequireView('hr', 'leaves')
  async getSummary(@Param('companyId') companyId: string) {
    return this.leavesService.getSummary(companyId);
  }

  @Get('export')
  @RequireView('hr', 'leaves')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryLeavesDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.leavesService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);

    const columns = [
      { header: 'First Name', key: 'user.firstName', width: 20 },
      { header: 'Last Name', key: 'user.lastName', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Days', key: 'days', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Reason', key: 'reason', width: 30 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Leaves');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="leaves-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  // Get my leaves - users can always view their own leaves
  @Get('my')
  async getMyLeaves(
    @Param('companyId') companyId: string,
    @Query() query: QueryLeavesDto,
    @Request() req: any,
  ) {
    return this.leavesService.getMyLeaves(companyId, req.user.id, query);
  }

  // Get my balance - users can always view their own balance
  @Get('my/balance')
  async getMyBalance(
    @Param('companyId') companyId: string,
    @Query('year') year: string,
    @Request() req: any,
  ) {
    return this.leavesService.getBalance(
      companyId,
      req.user.id,
      year ? parseInt(year) : undefined,
    );
  }

  // Get balance for a user (requires view permission)
  @Get('balance/:userId')
  @RequireView('hr', 'leaves')
  async getBalance(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Query('year') year: string,
  ) {
    return this.leavesService.getBalance(
      companyId,
      userId,
      year ? parseInt(year) : undefined,
    );
  }

  // Get one leave
  @Get(':id')
  @RequireView('hr', 'leaves')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.leavesService.findOne(companyId, id);
  }

  // Update a leave request
  @Patch(':id')
  @RequireEdit('hr', 'leaves')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveDto,
    @Request() req: any,
  ) {
    return this.leavesService.update(companyId, id, req.user.id, dto);
  }

  // Approve a leave request
  @Post(':id/approve')
  @RequireEdit('hr', 'leaves')
  async approve(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.leavesService.approve(companyId, id, req.user.id);
  }

  // Reject a leave request
  @Post(':id/reject')
  @RequireEdit('hr', 'leaves')
  async reject(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RejectLeaveDto,
    @Request() req: any,
  ) {
    return this.leavesService.reject(companyId, id, req.user.id, dto);
  }

  // Cancel a leave request
  @Post(':id/cancel')
  @RequireEdit('hr', 'leaves')
  async cancel(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.leavesService.cancel(companyId, id, req.user.id);
  }

  // Delete a leave request
  @Delete(':id')
  @RequireDelete('hr', 'leaves')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.leavesService.remove(companyId, id, req.user.id);
  }
}
