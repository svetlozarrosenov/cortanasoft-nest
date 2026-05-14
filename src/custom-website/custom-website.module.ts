import { Module } from '@nestjs/common';
import { CustomWebsiteController } from './custom-website.controller';
import { CustomWebsiteService } from './custom-website.service';

@Module({
  controllers: [CustomWebsiteController],
  providers: [CustomWebsiteService],
})
export class CustomWebsiteModule {}
