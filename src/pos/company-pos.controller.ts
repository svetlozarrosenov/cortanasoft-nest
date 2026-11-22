import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PosService } from './pos.service';
import { PosEvent, PosEventsService } from './pos-events.service';
import { CreateSaleDto, QueryPosProductsDto, QueryPosSerialsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Point of sale: the cashier's screen. It has its own product list so a
// cashier needs no access to the product catalogue or the sales module.
@Controller('companies/:companyId/pos')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPosController {
  constructor(
    private pos: PosService,
    private posEvents: PosEventsService,
  ) {}

  // Server-sent events: one connection held open for as long as the screen
  // is, over which it hears of registers coming and going and of every step
  // of a sale. It replaces asking for them over and over.
  @Get('events')
  @RequireView('pos', 'register')
  async events(
    @Param('companyId') companyId: string,
    @Res() response: Response,
  ) {
    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Proxies must pass each event on at once instead of collecting them
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    const send = (event: PosEvent) =>
      response.write(`data: ${JSON.stringify(event)}\n\n`);

    // Subscribed before the first picture is taken, so nothing falls between
    const unsubscribe = this.posEvents.subscribe(companyId, send);
    // A comment line now and then keeps idle connections from being cut
    const beat = setInterval(() => response.write(': keep-alive\n\n'), 25_000);
    response.on('close', () => {
      clearInterval(beat);
      unsubscribe();
    });
    try {
      send({ type: 'devices', devices: await this.pos.listDevices(companyId) });
    } catch {
      response.end();
    }
  }

  @Get('devices')
  @RequireView('pos', 'register')
  devices(@Param('companyId') companyId: string) {
    return this.pos.listDevices(companyId);
  }

  @Get('categories')
  @RequireView('pos', 'register')
  categories(@Param('companyId') companyId: string) {
    return this.pos.listCategories(companyId);
  }

  @Get('products')
  @RequireView('pos', 'register')
  products(
    @Param('companyId') companyId: string,
    @Query() query: QueryPosProductsDto,
  ) {
    return this.pos.listProducts(companyId, query);
  }

  @Get('serials')
  @RequireView('pos', 'register')
  serials(
    @Param('companyId') companyId: string,
    @Query() query: QueryPosSerialsDto,
  ) {
    return this.pos.listSerials(companyId, query);
  }

  @Post('sales')
  @RequireCreate('pos', 'register')
  createSale(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSaleDto,
  ) {
    return this.pos.createSale(companyId, user.id, dto);
  }

  @Get('sales/:id')
  @RequireView('pos', 'register')
  getSale(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.pos.getSale(companyId, id);
  }

  @Post('sales/:id/cancel')
  @RequireCreate('pos', 'register')
  @HttpCode(HttpStatus.OK)
  cancelSale(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.pos.cancelSale(companyId, id);
  }
}
