import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Truncate large response bodies so we don't blow up the audit log row.
const MAX_RESPONSE_LOG_LENGTH = 4000;

// Hard upper bound on a single delivery — we never want a slow receiver
// to keep an outbound HTTP socket open and starve other inventory syncs.
const DELIVERY_TIMEOUT_MS = 10_000;

// Wire-format of the body POSTed to subscribers. `id` is a unique
// delivery id (also stored on the audit row) so receivers can implement
// idempotency.
export interface OutboundWebhookEnvelope<T = unknown> {
  id: string;
  event: string;
  occurredAt: string; // ISO timestamp
  companyId: string;
  data: T;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private prisma: PrismaService) {}

  // Sign the JSON body with HMAC-SHA256 using the subscription's secret.
  // The receiver verifies with the same secret — `x-cortana-signature`
  // header is the contract.
  private sign(body: string, secret: string): string {
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }

  // Emit an `order.changed` event for the shop side, but ONLY when the
  // order has an externalId — meaning it's anchored to a shop record. Pure
  // cortana orders (no shop link) silently skip this; we don't want to
  // notify nobody and we don't want to leak cortana-only ids to the
  // outside world. Safe to call from any service that mutated an order;
  // the dispatcher reads fresh state before sending.
  async emitOrderChanged(companyId: string, orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, companyId },
        select: {
          id: true,
          orderNumber: true,
          externalId: true,
          status: true,
          paymentStatus: true,
          paidAmount: true,
          total: true,
        },
      });
      if (!order || !order.externalId) return;
      await this.dispatch(companyId, 'order.changed', {
        externalId: order.externalId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paidAmount: Number(order.paidAmount),
        total: Number(order.total),
      });
    } catch (err) {
      this.logger.warn(`emitOrderChanged(${orderId}) failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Fire-and-forget dispatch of an event to every active subscription on
  // the company that asked for it. Resolves AFTER all deliveries finish
  // logging, but callers usually `void this.dispatch(...)` so they don't
  // wait. Never throws — exceptions are logged and swallowed.
  async dispatch<T>(companyId: string, event: string, data: T): Promise<void> {
    try {
      const webhooks = await this.prisma.integrationWebhook.findMany({
        where: {
          companyId,
          isActive: true,
          events: { has: event },
        },
      });

      if (webhooks.length === 0) return;

      await Promise.allSettled(
        webhooks.map(webhook => this.deliverOne(webhook.id, webhook.companyId, webhook.webhookUrl, webhook.secret, event, data)),
      );
    } catch (err) {
      this.logger.warn(`Webhook dispatch failed for ${event}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async deliverOne<T>(
    webhookId: string,
    companyId: string,
    url: string,
    secret: string,
    event: string,
    data: T,
  ): Promise<void> {
    // Generate the delivery row up-front so we have an id to embed in
    // the envelope (receivers can dedup on it).
    const delivery = await this.prisma.integrationWebhookDelivery.create({
      data: {
        webhookId,
        companyId,
        event,
        payload: data as object, // Prisma JSON column accepts any serialisable value
      },
    });

    const envelope: OutboundWebhookEnvelope<T> = {
      id: delivery.id,
      event,
      occurredAt: new Date().toISOString(),
      companyId,
      data,
    };
    const body = JSON.stringify(envelope);
    const signature = this.sign(body, secret);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cortana-signature': signature,
          'x-cortana-event': event,
          'x-cortana-delivery': delivery.id,
        },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      const responseBody = await res.text().catch(() => '');
      const truncated = responseBody.length > MAX_RESPONSE_LOG_LENGTH
        ? responseBody.slice(0, MAX_RESPONSE_LOG_LENGTH) + '…[truncated]'
        : responseBody;

      await this.prisma.integrationWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          succeeded: res.ok,
          responseStatus: res.status,
          responseBody: truncated || null,
          deliveredAt: new Date(),
        },
      });

      if (!res.ok) {
        this.logger.warn(`Webhook ${event} → ${url} returned ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook ${event} → ${url} threw: ${message}`);
      await this.prisma.integrationWebhookDelivery
        .update({
          where: { id: delivery.id },
          data: {
            succeeded: false,
            errorMessage: message,
            deliveredAt: new Date(),
          },
        })
        .catch(() => { /* ignore — already failed once */ });
    }
  }
}
