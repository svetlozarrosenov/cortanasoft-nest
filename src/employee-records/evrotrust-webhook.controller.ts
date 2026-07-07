import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { EmployeeSignatureRequestsService } from './employee-signature-requests.service';

/**
 * Callback endpoint за Евротръст (Vendor callback API). ПУБЛИЧЕН — Евротръст
 * праща POST при промяна на статуса на документ за подписване.
 *
 * Сигурност: не разкриваме данни (винаги 204); действието е идемпотентно и
 * се прилага само върху PENDING заявка с точния transactionID (128-битов,
 * непознаваем). TODO(evrotrust-test): ако Евротръст поддържа подписан
 * callback или фиксирани IP-та — добавяме проверка при тест достъпа.
 */
@Controller('evrotrust')
export class EvrotrustWebhookController {
  constructor(private readonly signatures: EmployeeSignatureRequestsService) {}

  @Post('document/offline/ready')
  @HttpCode(204)
  async documentOfflineReady(
    @Body()
    body: {
      transactionID?: string;
      status?: number;
      automatedSignError?: string;
      rejectReason?: string;
    },
  ) {
    if (!body?.transactionID || typeof body.status !== 'number') return;
    await this.signatures.handleDocumentReady(
      body.transactionID,
      body.status,
      body.rejectReason || body.automatedSignError,
    );
  }
}
