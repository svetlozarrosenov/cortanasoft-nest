import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('countries')
@UseGuards(JwtAuthGuard)
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('isEU') isEU?: string,
  ) {
    const active =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const eu = isEU === 'true' ? true : isEU === 'false' ? false : undefined;
    return this.countriesService.findAll(active, eu);
  }
}
