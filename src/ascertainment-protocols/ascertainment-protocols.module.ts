import { Module } from '@nestjs/common';
import { AscertainmentProtocolsService } from './ascertainment-protocols.service';
import { CompanyAscertainmentProtocolsController } from './company-ascertainment-protocols.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyAscertainmentProtocolsController],
  providers: [AscertainmentProtocolsService],
  exports: [AscertainmentProtocolsService],
})
export class AscertainmentProtocolsModule {}
