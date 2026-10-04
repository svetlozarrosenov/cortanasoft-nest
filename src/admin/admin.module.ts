import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyPlansModule } from '../company-plans/company-plans.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, CompanyPlansModule, UploadsModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
