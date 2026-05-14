import { Global, Module } from '@nestjs/common';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

// Global so any service can inject WebhookDispatcherService without each
// feature module having to import WebhooksModule explicitly.
@Global()
@Module({
  providers: [WebhookDispatcherService],
  exports: [WebhookDispatcherService],
})
export class WebhooksModule {}
