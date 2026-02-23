import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CompanyDepartmentsController } from './company-departments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyDepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
