import { Controller, Get, Param } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-tracking')
export class ServicePublicController {
  constructor(private readonly orders: ServiceOrdersService) {}

  @Get(':token')
  track(@Param('token') token: string) {
    return this.orders.findByPublicToken(token);
  }
}
