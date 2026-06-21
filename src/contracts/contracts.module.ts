import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ContractTemplatesService } from './contract-templates.service';
import { ContractsService } from './contracts.service';
import { ContractFilesService } from './contract-files.service';
import { CompanyContractTemplatesController } from './company-contract-templates.controller';
import { CompanyContractsController } from './company-contracts.controller';
import { CompanyContractFilesController } from './company-contract-files.controller';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [
    CompanyContractTemplatesController,
    CompanyContractsController,
    CompanyContractFilesController,
  ],
  providers: [
    ContractTemplatesService,
    ContractsService,
    ContractFilesService,
  ],
  exports: [ContractTemplatesService, ContractsService, ContractFilesService],
})
export class ContractsModule {}
