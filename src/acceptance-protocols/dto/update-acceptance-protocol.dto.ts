import { PartialType } from '@nestjs/mapped-types';
import { CreateAcceptanceProtocolDto } from './create-acceptance-protocol.dto';

export class UpdateAcceptanceProtocolDto extends PartialType(
  CreateAcceptanceProtocolDto,
) {}
