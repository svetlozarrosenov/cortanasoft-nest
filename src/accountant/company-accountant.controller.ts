import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AccountantService } from './accountant.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  QueryPeriodDto,
  QueryArchivesDto,
  CreateBankStatementDto,
  UpdateAccountantSettingsDto,
  SendToAccountantDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/accountant')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyAccountantController {
  constructor(
    private readonly accountantService: AccountantService,
    private readonly uploads: UploadsService,
  ) {}

  /**
   * Стриймва качен счетоводен файл (банково извлечение / разходна фактура) от R2
   * по неговия ключ. Файловете се пазят като частни R2 ключове (folder/companyId/uuid),
   * затова не са директно достъпни — минават през този проксирован, company-scoped
   * endpoint. Ключът се валидира да е на текущата фирма (без cross-tenant достъп).
   */
  @Get('file')
  @RequireAnyPermission(
    { module: 'accountant', page: 'income', action: 'view' },
    { module: 'accountant', page: 'expenses', action: 'view' },
    { module: 'accountant', page: 'bankStatements', action: 'view' },
  )
  async file(
    @Param('companyId') companyId: string,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    if (!key || key.includes('..') || key.split('/')[1] !== companyId) {
      throw new BadRequestException('Невалиден ключ на файл');
    }
    const { stream, contentType, contentLength } =
      await this.uploads.getFile(key);
    res.set({
      'Content-Type': contentType,
      ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
    });
    stream.pipe(res);
  }

  @Get('income')
  @RequireView('accountant', 'income')
  income(
    @Param('companyId') companyId: string,
    @Query() query: QueryPeriodDto,
  ) {
    return this.accountantService.income(companyId, query);
  }

  @Get('expenses')
  @RequireView('accountant', 'expenses')
  expenses(
    @Param('companyId') companyId: string,
    @Query() query: QueryPeriodDto,
  ) {
    return this.accountantService.expenses(companyId, query);
  }

  @Get('bank-statements')
  @RequireView('accountant', 'bankStatements')
  statements(
    @Param('companyId') companyId: string,
    @Query() query: QueryPeriodDto,
  ) {
    return this.accountantService.statements(companyId, query);
  }

  @Post('bank-statements')
  @RequireCreate('accountant', 'bankStatements')
  createStatement(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBankStatementDto,
  ) {
    return this.accountantService.createStatement(companyId, dto);
  }

  @Delete('bank-statements/:id')
  @RequireDelete('accountant', 'bankStatements')
  deleteStatement(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.accountantService.deleteStatement(companyId, id);
  }

  @Get('settings')
  @RequireView('accountant', 'settings')
  getSettings(@Param('companyId') companyId: string) {
    return this.accountantService.getSettings(companyId);
  }

  @Patch('settings')
  @RequireEdit('accountant', 'settings')
  updateSettings(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateAccountantSettingsDto,
  ) {
    return this.accountantService.updateSettings(companyId, dto);
  }

  @Get('register')
  @RequireView('accountant', 'income')
  async register(
    @Param('companyId') companyId: string,
    @Query() query: QueryPeriodDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.accountantService.getRegister(
      companyId,
      query.year,
      query.month,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Post('send')
  @RequireEdit('accountant', 'income')
  send(
    @Param('companyId') companyId: string,
    @Body() dto: SendToAccountantDto,
  ) {
    return this.accountantService.sendToAccountant(companyId, dto);
  }

  // ===== Архив на изпратените пакети =====

  @Get('archives')
  @RequireView('accountant', 'income')
  listArchives(
    @Param('companyId') companyId: string,
    @Query() query: QueryArchivesDto,
  ) {
    return this.accountantService.listArchives(companyId, query);
  }

  @Delete('archives/:id')
  @RequireEdit('accountant', 'income')
  deleteArchive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.accountantService.deleteArchive(companyId, id);
  }

  // Email a pre-built package ZIP (built on the frontend; may include income PDFs).
  @Post('send-package')
  @RequireEdit('accountant', 'income')
  @UseInterceptors(FileInterceptor('file'))
  sendPackage(
    @Param('companyId') companyId: string,
    @Body() body: { year: string; month: string },
    @UploadedFile() file: { buffer: Buffer; originalname?: string },
  ) {
    return this.accountantService.sendPackage(
      companyId,
      Number(body.year),
      Number(body.month),
      file,
    );
  }
}
