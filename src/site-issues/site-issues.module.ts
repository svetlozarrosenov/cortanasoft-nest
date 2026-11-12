import { Module } from '@nestjs/common';
import { SiteIssuesService } from './site-issues.service';
import { CompanySiteIssuesController } from './company-site-issues.controller';

@Module({
  controllers: [CompanySiteIssuesController],
  providers: [SiteIssuesService],
  exports: [SiteIssuesService],
})
export class SiteIssuesModule {}
