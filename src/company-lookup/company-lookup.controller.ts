import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CompanyLookupService } from './company-lookup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';

// Публични регистрови данни за фирма по ЕИК — за „Попълни по ЕИК" във
// формите за клиент/лийд, доставчик (Доставчици, Доставки, Разходи) и
// фирма-клиент в Администрация. Само влязъл потребител на компанията;
// самите форми са зад правата на съответния модул.
@Controller('companies/:companyId/company-lookup')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
export class CompanyLookupController {
  constructor(private readonly service: CompanyLookupService) {}

  @Get(':eik')
  lookup(@Param('eik') eik: string) {
    return this.service.lookup(eik);
  }
}
