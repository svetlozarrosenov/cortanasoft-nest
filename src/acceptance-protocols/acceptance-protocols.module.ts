import { Module } from '@nestjs/common';
import { AcceptanceProtocolsService } from './acceptance-protocols.service';
import { CompanyAcceptanceProtocolsController } from './company-acceptance-protocols.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyAcceptanceProtocolsController],
  providers: [AcceptanceProtocolsService],
  exports: [AcceptanceProtocolsService],
})
export class AcceptanceProtocolsModule {}
