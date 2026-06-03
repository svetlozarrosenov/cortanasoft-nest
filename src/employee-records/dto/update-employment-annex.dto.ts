import { PartialType } from '@nestjs/mapped-types';
import { CreateEmploymentAnnexDto } from './create-employment-annex.dto';

export class UpdateEmploymentAnnexDto extends PartialType(
  CreateEmploymentAnnexDto,
) {}
