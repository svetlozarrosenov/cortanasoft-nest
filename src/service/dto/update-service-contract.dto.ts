import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateServiceContractDto } from './create-service-contract.dto';

export class UpdateServiceContractDto extends PartialType(
  OmitType(CreateServiceContractDto, ['customerId'] as const),
) {}
