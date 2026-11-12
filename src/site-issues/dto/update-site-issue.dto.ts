import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteIssueDto } from './create-site-issue.dto';

export class UpdateSiteIssueDto extends PartialType(CreateSiteIssueDto) {}
