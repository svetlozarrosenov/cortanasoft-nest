import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import { EmploymentContractsService } from './employment-contracts.service';
import { EmployeeDocumentsService } from './employee-documents.service';
import { EmployeeDocumentFilesService } from './employee-document-files.service';
import { CompanyEmploymentContractsController } from './company-employment-contracts.controller';
import { CompanyEmployeeDocumentsController } from './company-employee-documents.controller';
import { CompanyEmployeeDocumentFilesController } from './company-employee-document-files.controller';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [
    CompanyEmploymentContractsController,
    CompanyEmployeeDocumentsController,
    CompanyEmployeeDocumentFilesController,
  ],
  providers: [
    EmployeeRecordNumberingService,
    EmploymentContractsService,
    EmployeeDocumentsService,
    EmployeeDocumentFilesService,
  ],
  exports: [
    EmploymentContractsService,
    EmployeeDocumentsService,
    EmployeeDocumentFilesService,
  ],
})
export class EmployeeRecordsModule {}
