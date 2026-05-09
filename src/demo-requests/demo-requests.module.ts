import { Module } from '@nestjs/common';
import { DemoRequestsService } from './demo-requests.service';
import { DemoRequestsController } from './demo-requests.controller';
import { AdminDemoRequestsController } from './admin-demo-requests.controller';
import { DemoRequestTasksCronService } from './demo-request-tasks.cron';
import { MetaPixelModule } from '../meta-pixel/meta-pixel.module';

@Module({
  imports: [MetaPixelModule],
  controllers: [DemoRequestsController, AdminDemoRequestsController],
  providers: [DemoRequestsService, DemoRequestTasksCronService],
  exports: [DemoRequestsService],
})
export class DemoRequestsModule {}
