import { PartialType } from '@nestjs/mapped-types';
import { CreateStorageZoneDto } from './create-storage-zone.dto';

export class UpdateStorageZoneDto extends PartialType(CreateStorageZoneDto) {}
