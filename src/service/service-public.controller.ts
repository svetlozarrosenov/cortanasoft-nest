import { Controller, Get, Param, Post } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-tracking')
export class ServicePublicController {
  constructor(private readonly orders: ServiceOrdersService) {}

  @Get(':token')
  track(@Param('token') token: string) {
    return this.orders.findByPublicToken(token);
  }

  // Одобрение на ремонта от клиента — токенът е тайната (24 байта)
  @Post(':token/approve')
  approve(@Param('token') token: string) {
    return this.orders.approveByPublicToken(token);
  }
}
