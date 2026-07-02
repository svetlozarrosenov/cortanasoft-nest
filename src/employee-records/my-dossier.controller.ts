import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MyDossierService } from './my-dossier.service';
import { EmployeeConsentsService } from './employee-consents.service';
import { EmployeeRecordNotificationsService } from './employee-record-notifications.service';
import { EmployeeSubmissionsService } from './employee-submissions.service';
import { DossierCopyRequestsService } from './dossier-copy-requests.service';
import { EmployeeSignatureRequestsService } from './employee-signature-requests.service';
import { EmployeeDocumentFilesService } from './employee-document-files.service';
import {
  CreateCopyRequestDto,
  CreateEmployeeSubmissionDto,
  DeclineSignatureRequestDto,
  RecordConsentDto,
} from './dto';

/**
 * „Моето досие" — self-service достъп на служителя до собственото му трудово
 * досие (чл. 14 от наредбата). Достъпът се дава през ролята (страница
 * employeeRecords.myDossier, view) — като всеки друг модул. Собствеността
 * се проверява в service слоя (userId от JWT), тенантът — от CompanyAccessGuard.
 */
@Controller('companies/:companyId/my-dossier')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class MyDossierController {
  constructor(
    private readonly dossier: MyDossierService,
    private readonly consents: EmployeeConsentsService,
    private readonly notifications: EmployeeRecordNotificationsService,
    private readonly submissions: EmployeeSubmissionsService,
    private readonly copyRequests: DossierCopyRequestsService,
    private readonly signatures: EmployeeSignatureRequestsService,
    private readonly files: EmployeeDocumentFilesService,
  ) {}

  @Get()
  @RequireView('employeeRecords', 'myDossier')
  overview(@Param('companyId') companyId: string, @CurrentUser() user: any) {
    return this.dossier.overview(companyId, user.id);
  }

  @Get('files/:id/file')
  @RequireView('employeeRecords', 'myDossier')
  async file(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { stream, contentType, fileName } = await this.dossier.fileStream(
      companyId,
      id,
      user.id,
    );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    stream.pipe(res);
  }

  // ===== Съгласие (чл. 4) =====

  @Get('consent')
  @RequireView('employeeRecords', 'myDossier')
  async consent(@Param('companyId') companyId: string, @CurrentUser() user: any) {
    const [current, history] = await Promise.all([
      this.consents.current(companyId, user.id),
      this.consents.history(companyId, user.id),
    ]);
    return { ...current, history: history.data };
  }

  @Post('consent')
  @RequireView('employeeRecords', 'myDossier')
  recordConsent(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: RecordConsentDto,
  ) {
    return this.consents.record(companyId, user.id, user.id, {
      action: dto.action,
      method: dto.method ?? 'през приложението (Моето досие)',
      note: dto.note,
    });
  }

  // ===== Потвърждаване на получаване (връчване) =====

  @Post('confirm/:entityType/:id')
  @RequireView('employeeRecords', 'myDossier')
  confirmDelivery(
    @Param('companyId') companyId: string,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notifications.confirmDelivery(
      companyId,
      entityType,
      id,
      { id: user.id, email: user.email },
      { employeeOnly: true },
    );
  }

  // ===== Входящи документи (чл. 9) =====

  @Get('submissions')
  @RequireView('employeeRecords', 'myDossier')
  mySubmissions(@Param('companyId') companyId: string, @CurrentUser() user: any) {
    return this.submissions.findMine(companyId, user.id);
  }

  @Post('submissions')
  @RequireView('employeeRecords', 'myDossier')
  createSubmission(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateEmployeeSubmissionDto,
  ) {
    return this.submissions.create(companyId, user.id, dto);
  }

  @Post('submissions/:id/files')
  @RequireView('employeeRecords', 'myDossier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSubmissionFile(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.submissions.assertOwn(companyId, id, user.id);
    return this.files.upload(
      companyId,
      user.id,
      'employeeSubmission',
      id,
      file,
      'ATTACHMENT',
    );
  }

  // ===== Заявки за преписи (чл. 5) =====

  @Get('copy-requests')
  @RequireView('employeeRecords', 'myDossier')
  myCopyRequests(@Param('companyId') companyId: string, @CurrentUser() user: any) {
    return this.copyRequests.findMine(companyId, user.id);
  }

  @Post('copy-requests')
  @RequireView('employeeRecords', 'myDossier')
  createCopyRequest(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCopyRequestDto,
  ) {
    return this.copyRequests.create(companyId, user.id, dto);
  }

  // ===== Подписване (чл. 7) =====

  @Get('signature-requests')
  @RequireView('employeeRecords', 'myDossier')
  mySignatureRequests(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.signatures.findForSigner(companyId, user.id);
  }

  @Post('signature-requests/:id/sign')
  @RequireView('employeeRecords', 'myDossier')
  sign(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.signatures.sign(companyId, id, {
      id: user.id,
      email: user.email,
    });
  }

  @Post('signature-requests/:id/decline')
  @RequireView('employeeRecords', 'myDossier')
  decline(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DeclineSignatureRequestDto,
  ) {
    return this.signatures.decline(
      companyId,
      id,
      { id: user.id, email: user.email },
      dto.reason,
    );
  }
}
