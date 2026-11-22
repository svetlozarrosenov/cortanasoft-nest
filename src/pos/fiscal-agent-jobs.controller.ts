import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PosService } from './pos.service';
import { BUSY_WINDOW_MS, PosEventsService } from './pos-events.service';
import { DeviceSaleDto, JobProgressDto, JobResultDto } from './dto';
import { FiscalDeviceGuard } from '../fiscal-devices/fiscal-device.guard';
import type { FiscalDeviceIdentity } from '../fiscal-devices/fiscal-devices.service';

type DeviceRequest = { fiscalDevice: FiscalDeviceIdentity };

// Called by the cash register: it asks for work and reports what happened.
@Controller('fiscal-agent')
@UseGuards(FiscalDeviceGuard)
export class FiscalAgentJobsController {
  constructor(
    private pos: PosService,
    private posEvents: PosEventsService,
  ) {}

  /** Every call from a register shows it is there. */
  private seen(device: FiscalDeviceIdentity, quietMs?: number) {
    this.posEvents.seen(device.id, device.companyId, quietMs);
  }

  // The products the register keeps so it can sell on its own
  @Get('catalog')
  catalog(@Req() request: DeviceRequest) {
    return this.pos.catalog(request.fiscalDevice.companyId);
  }

  // A sale rung up on the register itself
  @Post('sales')
  @HttpCode(HttpStatus.OK)
  deviceSale(@Req() request: DeviceRequest, @Body() dto: DeviceSaleDto) {
    return this.pos.recordDeviceSale(
      request.fiscalDevice.id,
      request.fiscalDevice.companyId,
      dto,
    );
  }

  // Long poll: answers at once when a sale is waiting, otherwise holds the
  // request for up to `wait` seconds. 204 means "nothing, ask again".
  @Get('jobs/next')
  async next(
    @Req() request: DeviceRequest,
    @Query('wait') wait: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const seconds = Math.max(0, Math.min(Number(wait) || 0, 25));
    // A register that hangs up while waiting (app closed, network gone)
    // must not be handed a sale it will never receive.
    const gone = new AbortController();
    this.seen(request.fiscalDevice);
    response.on('close', () => {
      // Closed before the answer was written: the register hung up
      if (response.writableEnded) return;
      gone.abort();
      this.posEvents.hungUp(request.fiscalDevice.id);
    });
    const job = await this.pos.nextJob(
      request.fiscalDevice.id,
      seconds * 1000,
      gone.signal,
    );
    // With a sale in hand the register goes quiet while the customer pays
    if (job) this.seen(request.fiscalDevice, BUSY_WINDOW_MS);
    if (!job) response.status(HttpStatus.NO_CONTENT);
    return job ?? undefined;
  }

  @Post('jobs/:id/progress')
  @HttpCode(HttpStatus.OK)
  progress(
    @Req() request: DeviceRequest,
    @Param('id') id: string,
    @Body() dto: JobProgressDto,
  ) {
    this.seen(request.fiscalDevice, BUSY_WINDOW_MS);
    return this.pos.reportProgress(request.fiscalDevice.id, id, dto.stage);
  }

  @Post('jobs/:id/result')
  @HttpCode(HttpStatus.OK)
  result(
    @Req() request: DeviceRequest,
    @Param('id') id: string,
    @Body() dto: JobResultDto,
  ) {
    this.seen(request.fiscalDevice);
    return this.pos.reportResult(request.fiscalDevice.id, id, dto);
  }
}
