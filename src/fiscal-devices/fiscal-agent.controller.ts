import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { FiscalDevicesService } from './fiscal-devices.service';
import type { FiscalDeviceIdentity } from './fiscal-devices.service';
import { FiscalDeviceGuard } from './fiscal-device.guard';
import { DeviceChallengeDto, DeviceTokenDto, PairDeviceDto } from './dto';

// Endpoints called by the Cortana Fiscal app on the cash register. There is
// no user session here: a device proves itself with its own key.
@Controller('fiscal-agent')
@UseGuards(ThrottlerGuard)
export class FiscalAgentController {
  constructor(private devices: FiscalDevicesService) {}

  // The code is the only secret at this point, so guessing is slowed down
  @Post('pair')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 600000 },
  })
  pair(@Body() dto: PairDeviceDto) {
    return this.devices.pair(dto);
  }

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  challenge(@Body() dto: DeviceChallengeDto) {
    return this.devices.createChallenge(dto.deviceId);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  token(@Body() dto: DeviceTokenDto) {
    return this.devices.createToken(dto);
  }

  @Get('me')
  @UseGuards(FiscalDeviceGuard)
  me(@Req() request: { fiscalDevice: FiscalDeviceIdentity }) {
    return request.fiscalDevice;
  }
}
