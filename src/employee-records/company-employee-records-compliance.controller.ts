import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmployeeConsentsService } from './employee-consents.service';
import { EmployeeRecordsSettingsService } from './employee-records-settings.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { EmployeeSubmissionsService } from './employee-submissions.service';
import { DossierCopyRequestsService } from './dossier-copy-requests.service';
import { EmployeeSignatureRequestsService } from './employee-signature-requests.service';
import {
  AnswerSubmissionDto,
  CreateSignatureRequestDto,
  LogPrintDto,
  QueryAuditDto,
  RecordConsentDto,
  ResolveCopyRequestDto,
  UpdateEmployeeRecordsSettingsDto,
} from './dto';
import {
  DossierCopyRequestStatus,
  EmployeeSubmissionStatus,
  SignatureRequestStatus,
} from '@prisma/client';

/**
 * HR страна на съответствието с наредбата: съгласия, вътрешни правила,
 * одит журнал, входящи документи, заявки за преписи и заявки за подпис.
 */
@Controller('companies/:companyId/employee-records')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmployeeRecordsComplianceController {
  constructor(
    private readonly consents: EmployeeConsentsService,
    private readonly settings: EmployeeRecordsSettingsService,
    private readonly audit: EmployeeRecordAuditService,
    private readonly submissions: EmployeeSubmissionsService,
    private readonly copyRequests: DossierCopyRequestsService,
    private readonly signatures: EmployeeSignatureRequestsService,
  ) {}

  // ===== Съгласия (чл. 4) =====

  @Get('consents')
  @RequireView('employeeRecords', 'dossiers')
  consentOverview(@Param('companyId') companyId: string) {
    return this.consents.overview(companyId);
  }

  @Get('consents/:userId')
  @RequireView('employeeRecords', 'dossiers')
  async consentFor(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    const [current, history] = await Promise.all([
      this.consents.current(companyId, userId),
      this.consents.history(companyId, userId),
    ]);
    return { ...current, history: history.data };
  }

  @Post('consents/:userId')
  @RequireEdit('employeeRecords', 'dossiers')
  recordConsent(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() dto: RecordConsentDto,
  ) {
    return this.consents.record(companyId, userId, user.id, dto);
  }

  // ===== Вътрешни правила (чл. 3 + чл. 6, ал. 2) =====

  @Get('settings')
  @RequireView('employeeRecords', 'settings')
  getSettings(@Param('companyId') companyId: string) {
    return this.settings.get(companyId);
  }

  @Patch('settings')
  @RequireEdit('employeeRecords', 'settings')
  updateSettings(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateEmployeeRecordsSettingsDto,
  ) {
    return this.settings.update(companyId, user.id, dto);
  }

  // ===== Одит журнал (чл. 12) — само четене + запис на разпечатки =====

  @Get('audit')
  @RequireView('employeeRecords', 'audit')
  auditLog(
    @Param('companyId') companyId: string,
    @Query() query: QueryAuditDto,
  ) {
    return this.audit.findAll(companyId, query);
  }

  /** Проследяване на отпечатаните хартиени преписи (чл. 12, ал. 1, т. 4). */
  @Post('audit/print')
  @RequireView('employeeRecords', 'dossiers')
  async logPrint(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: LogPrintDto,
  ) {
    await this.audit.log(companyId, {
      action: 'PRINT',
      actorId: user.id,
      actorEmail: user.email,
      targetUserId: dto.targetUserId ?? null,
      entityType: dto.entityType,
      entityId: dto.entityId,
      detail: dto.detail ?? null,
    });
    return { success: true };
  }

  // ===== Входящи документи (чл. 9) =====

  @Get('submissions')
  @RequireView('employeeRecords', 'submissions')
  allSubmissions(
    @Param('companyId') companyId: string,
    @Query('status') status?: EmployeeSubmissionStatus,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.submissions.findAll(companyId, { status, userId, page, limit });
  }

  @Get('submissions/:id')
  @RequireView('employeeRecords', 'submissions')
  submission(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.submissions.findOne(companyId, id);
  }

  @Patch('submissions/:id')
  @RequireEdit('employeeRecords', 'submissions')
  answerSubmission(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AnswerSubmissionDto,
  ) {
    return this.submissions.answer(
      companyId,
      id,
      { id: user.id, email: user.email },
      dto,
    );
  }

  // ===== Заявки за преписи (чл. 5) =====

  @Get('copy-requests')
  @RequireView('employeeRecords', 'submissions')
  allCopyRequests(
    @Param('companyId') companyId: string,
    @Query('status') status?: DossierCopyRequestStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.copyRequests.findAll(companyId, { status, page, limit });
  }

  @Patch('copy-requests/:id')
  @RequireEdit('employeeRecords', 'submissions')
  resolveCopyRequest(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ResolveCopyRequestDto,
  ) {
    return this.copyRequests.resolve(
      companyId,
      id,
      { id: user.id, email: user.email },
      dto,
    );
  }

  // ===== Заявки за подпис (чл. 7) =====

  @Get('signature-requests')
  @RequireView('employeeRecords', 'dossiers')
  allSignatureRequests(
    @Param('companyId') companyId: string,
    @Query('signerUserId') signerUserId?: string,
    @Query('fileId') fileId?: string,
    @Query('status') status?: SignatureRequestStatus,
  ) {
    return this.signatures.findAll(companyId, { signerUserId, fileId, status });
  }

  @Post('signature-requests')
  @RequireEdit('employeeRecords', 'dossiers')
  createSignatureRequest(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSignatureRequestDto,
  ) {
    return this.signatures.create(
      companyId,
      { id: user.id, email: user.email },
      dto,
    );
  }

  @Post('signature-requests/:id/cancel')
  @RequireEdit('employeeRecords', 'dossiers')
  cancelSignatureRequest(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.signatures.cancel(companyId, id, {
      id: user.id,
      email: user.email,
    });
  }

  /** Статус на доставчиците (за UI бадж „Евротръст — очаква активиране"). */
  @Get('providers')
  @RequireView('employeeRecords', 'dossiers')
  providers() {
    return this.signatures.providerStatus();
  }
}
