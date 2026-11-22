import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FiscalDevicesService } from './fiscal-devices.service';

/**
 * Authenticates a paired cash register by its bearer token and puts its
 * identity on `request.fiscalDevice`. Devices never use user sessions.
 */
@Injectable()
export class FiscalDeviceGuard implements CanActivate {
  constructor(private devices: FiscalDevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    request.fiscalDevice = await this.devices.authenticate(header.slice(7));
    return true;
  }
}
