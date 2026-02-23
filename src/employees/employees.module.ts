import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CompanyEmployeesController } from './company-employees.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyEmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
