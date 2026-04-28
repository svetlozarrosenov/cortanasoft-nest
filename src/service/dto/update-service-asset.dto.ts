import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateServiceAssetDto } from './create-service-asset.dto';

export class UpdateServiceAssetDto extends PartialType(
  OmitType(CreateServiceAssetDto, ['customerId'] as const),
) {}
