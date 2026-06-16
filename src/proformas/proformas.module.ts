import { Module } from '@nestjs/common';
import { ProformasService } from './proformas.service';
import { CompanyProformasController } from './company-proformas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyProformasController],
  providers: [ProformasService],
  exports: [ProformasService],
})
export class ProformasModule {}
