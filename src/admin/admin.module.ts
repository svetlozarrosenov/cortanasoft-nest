import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyPlansModule } from '../company-plans/company-plans.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, CompanyPlansModule, UploadsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
