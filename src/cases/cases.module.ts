import { Module } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CompanyCasesController } from './company-cases.controller';
import { CasesPublicController } from './cases-public.controller';
import { UploadsModule } from '../uploads/uploads.module';

// Казуси — клиентски тикети на фирмата-наемател (отделно от support/ и tickets/).
// PushNotificationsModule е @Global.
@Module({
  imports: [UploadsModule],
  controllers: [CompanyCasesController, CasesPublicController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
