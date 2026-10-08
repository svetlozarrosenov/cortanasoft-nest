import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { EmployeeAdvancesService } from './employee-advances.service';
import {
  CreateEmployeeAdvanceDto,
  LedgerQueryDto,
  UpdateEmployeeAdvanceDto,
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

// Право: hr.advances — не се дава автоматично на съществуващи роли.
@Controller('companies/:companyId/employee-advances')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class EmployeeAdvancesController {
  constructor(
    private advances: EmployeeAdvancesService,
    private exportService: ExportService,
  ) {}

  @Get('summary')
  @RequireView('hr', 'advances')
  summary(@Param('companyId') companyId: string) {
    return this.advances.summary(companyId);
  }

  @Get('employees')
  @RequireView('hr', 'advances')
  employees(@Param('companyId') companyId: string) {
    return this.advances.employees(companyId);
  }

  @Get('ledger/:userId')
  @RequireView('hr', 'advances')
  ledger(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Query() query: LedgerQueryDto,
  ) {
    return this.advances.ledger(companyId, userId, query);
  }

  // Хронологията като файл — същите колони като на екрана
  @Get('ledger/:userId/export')
  @RequireView('hr', 'advances')
  async exportLedger(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Query() query: LedgerQueryDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const ledger = await this.advances.ledger(companyId, userId, query);
    const kindLabel = {
      ADVANCE: 'Аванс',
      RETURN: 'Връщане',
      EXPENSE: 'Разход',
    };
    const rows = ledger.rows.map((r) => ({
      date: r.date,
      kind: kindLabel[r.kind],
      description:
        r.kind === 'EXPENSE'
          ? [r.expense?.description, r.expense?.site?.name]
              .filter(Boolean)
              .join(' — ')
          : (r.note ?? ''),
      amount: r.amount,
      balance: r.balance,
      fromAdvance: r.allocations
        .map((a) => `${a.date} (${a.amount})`)
        .join(' + '),
    }));
    const columns = [
      { header: 'Дата', key: 'date', width: 12 },
      { header: 'Движение', key: 'kind', width: 12 },
      { header: 'Описание', key: 'description', width: 40 },
      { header: 'Сума', key: 'amount', width: 12 },
      { header: 'Салдо', key: 'balance', width: 12 },
      { header: 'От аванс', key: 'fromAdvance', width: 30 },
    ];
    const buffer = await this.exportService.generateFile(
      columns,
      rows,
      format,
      'Advances',
    );
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const name = `${ledger.user.firstName}-${ledger.user.lastName}`.replace(
      /\s+/g,
      '-',
    );
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="advances-${encodeURIComponent(name)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('balance/:userId')
  @RequireView('hr', 'advances')
  balance(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.advances.balance(companyId, userId);
  }

  @Post()
  @RequireCreate('hr', 'advances')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEmployeeAdvanceDto,
  ) {
    return this.advances.create(companyId, user.id, dto);
  }

  @Patch(':id')
  @RequireEdit('hr', 'advances')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeAdvanceDto,
  ) {
    return this.advances.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'advances')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.advances.remove(companyId, id);
  }
}
