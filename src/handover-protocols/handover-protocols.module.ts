import { Module } from '@nestjs/common';
import { HandoverProtocolsService } from './handover-protocols.service';
import { CompanyHandoverProtocolsController } from './company-handover-protocols.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyHandoverProtocolsController],
  providers: [HandoverProtocolsService],
  exports: [HandoverProtocolsService],
})
export class HandoverProtocolsModule {}
