import { PartialType } from '@nestjs/mapped-types';
import { CreateIntegrationWebhookDto } from './create-integration-webhook.dto';

export class UpdateIntegrationWebhookDto extends PartialType(CreateIntegrationWebhookDto) {}
