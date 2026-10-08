import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportModule } from '../common/export/export.module';
import { EmployeeAdvancesService } from './employee-advances.service';
import { EmployeeAdvancesController } from './employee-advances.controller';

@Module({
  imports: [PrismaModule, ExportModule],
  controllers: [EmployeeAdvancesController],
  providers: [EmployeeAdvancesService],
  exports: [EmployeeAdvancesService],
})
export class EmployeeAdvancesModule {}
