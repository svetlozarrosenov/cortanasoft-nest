import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
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

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [
    CompanyEmploymentContractsController,
    CompanyEmploymentAnnexesController,
    CompanyEmploymentOrdersController,
    CompanyJobDescriptionsController,
    CompanyTerminationsController,
    CompanyEmployeeDocumentsController,
    CompanyEmployeeDocumentFilesController,
    CompanyEmployeeRecordNotificationsController,
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
