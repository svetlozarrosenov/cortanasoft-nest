import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import { EmployeeProfileService } from './employee-profile.service';
import { EmployeeRecordsCronService } from './employee-records.cron';
import { CompanyEmployeeProfilesController } from './company-employee-profiles.controller';
import { EmploymentContractsService } from './employment-contracts.service';
import { EmploymentAnnexesService } from './employment-annexes.service';
import { EmploymentOrdersService } from './employment-orders.service';
import { JobDescriptionsService } from './job-descriptions.service';
import { TerminationsService } from './terminations.service';
import { EmployeeDocumentsService } from './employee-documents.service';
import { EmployeeDocumentFilesService } from './employee-document-files.service';
import { EmployeeRecordNotificationsService } from './employee-record-notifications.service';
import { CompanyEmploymentContractsController } from './company-employment-contracts.controller';
import { CompanyEmploymentAnnexesController } from './company-employment-annexes.controller';
import { CompanyEmploymentOrdersController } from './company-employment-orders.controller';
import { CompanyJobDescriptionsController } from './company-job-descriptions.controller';
import { CompanyTerminationsController } from './company-terminations.controller';
import { CompanyEmployeeDocumentsController } from './company-employee-documents.controller';
import { CompanyEmployeeDocumentFilesController } from './company-employee-document-files.controller';
import { CompanyEmployeeRecordNotificationsController } from './company-employee-record-notifications.controller';
import { CompanyEmployeeRecordsComplianceController } from './company-employee-records-compliance.controller';
import { MyDossierController } from './my-dossier.controller';
import { MyDossierService } from './my-dossier.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { EmployeeConsentsService } from './employee-consents.service';
import { EmployeeRecordsSettingsService } from './employee-records-settings.service';
import { EmployeeSubmissionsService } from './employee-submissions.service';
import { DossierCopyRequestsService } from './dossier-copy-requests.service';
import { EmployeeSignatureRequestsService } from './employee-signature-requests.service';
import { EvrotrustService } from './evrotrust.service';
import { EvrotrustIdentitiesService } from './evrotrust-identities.service';
import { EvrotrustWebhookController } from './evrotrust-webhook.controller';

@Module({
  imports: [PrismaModule, UploadsModule, PushNotificationsModule],
  controllers: [
    CompanyEmploymentContractsController,
    CompanyEmploymentAnnexesController,
    CompanyEmploymentOrdersController,
    CompanyJobDescriptionsController,
    CompanyTerminationsController,
    CompanyEmployeeDocumentsController,
    CompanyEmployeeDocumentFilesController,
    // Специфичните пътища (consents/settings/audit/...) са преди генеричния
    // :entityType/:entityId контролер, за да не се прихващат от него.
    CompanyEmployeeRecordsComplianceController,
    CompanyEmployeeRecordNotificationsController,
    CompanyEmployeeProfilesController,
    MyDossierController,
    EvrotrustWebhookController,
  ],
  providers: [
    EmployeeRecordNumberingService,
    EmploymentContractsService,
    EmploymentAnnexesService,
    EmploymentOrdersService,
    JobDescriptionsService,
    TerminationsService,
    EmployeeDocumentsService,
    EmployeeDocumentFilesService,
    EmployeeRecordNotificationsService,
    EmployeeProfileService,
    EmployeeRecordsCronService,
    EmployeeRecordAuditService,
    EmployeeConsentsService,
    EmployeeRecordsSettingsService,
    EmployeeSubmissionsService,
    DossierCopyRequestsService,
    EmployeeSignatureRequestsService,
    EvrotrustService,
    EvrotrustIdentitiesService,
    MyDossierService,
  ],
  exports: [
    EmploymentContractsService,
    EmploymentAnnexesService,
    EmploymentOrdersService,
    JobDescriptionsService,
    TerminationsService,
    EmployeeDocumentsService,
    EmployeeDocumentFilesService,
  ],
})
export class EmployeeRecordsModule {}
