import { PartialType } from '@nestjs/mapped-types';
import { CreateAscertainmentProtocolDto } from './create-ascertainment-protocol.dto';

export class UpdateAscertainmentProtocolDto extends PartialType(
  CreateAscertainmentProtocolDto,
) {}
