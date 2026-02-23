import { Module } from '@nestjs/common';
import { DemoRequestsService } from './demo-requests.service';
import { DemoRequestsController } from './demo-requests.controller';
import { AdminDemoRequestsController } from './admin-demo-requests.controller';

@Module({
  controllers: [DemoRequestsController, AdminDemoRequestsController],
  providers: [DemoRequestsService],
  exports: [DemoRequestsService],
})
export class DemoRequestsModule {}
