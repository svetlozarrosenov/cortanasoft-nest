import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('ping')
  ping() {
    return { success: true, message: 'pong' };
  }

  @Post('orders')
  @HttpCode(200)
  async createOrder(@Req() req: any, @Body() payload: any) {
    const companyId = req.apiKeyCompanyId;
    const result = await this.integrationsService.processOrder(
      companyId,
      payload,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('stock')
  async getStock(
    @Req() req: any,
    @Query('skus') skus?: string,
  ) {
    const companyId = req.apiKeyCompanyId;
    const skuList = skus ? skus.split(',').map((s) => s.trim()) : undefined;
    const result = await this.integrationsService.getStock(companyId, skuList);
    return {
      success: true,
      products: result,
    };
  }

  // Financial snapshot for a single order — used by shop's admin Order
  // detail page to render the "Финансово състояние" panel. Read-only:
  // shop never updates payment/invoice data here, just displays it.
  // Authenticated by the same ApiKeyGuard as the other /integrations
  // endpoints, so the shop's cs_live_ key is enough.
  //
  // Two routes are exposed because shop and cortana use different
  // identifiers: shop knows its own order id (saved as externalId on
  // cortana), cortana labels them with its own generated orderNumber.
  // Prefer the by-external-id route — it's stable against orderNumber
  // renumbering on the cortana side.
  @Get('orders/by-external-id/:externalId/financials')
  async getOrderFinancialsByExternalId(
    @Req() req: any,
    @Param('externalId') externalId: string,
  ) {
    return this.financialsFor(req.apiKeyCompanyId, { externalId });
  }

  @Get('orders/by-number/:orderNumber/financials')
  async getOrderFinancials(
    @Req() req: any,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.financialsFor(req.apiKeyCompanyId, { orderNumber });
  }

  private async financialsFor(
    companyId: string,
    lookup: { externalId?: string; orderNumber?: string },
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        companyId,
        ...(lookup.externalId !== undefined && { externalId: lookup.externalId }),
        ...(lookup.orderNumber !== undefined && { orderNumber: lookup.orderNumber }),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        subtotal: true,
        vatAmount: true,
        shippingCost: true,
        discount: true,
        paidAmount: true,
        invoicedAmount: true,
        advancedAmount: true,
        currency: { select: { code: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            method: true,
            reference: true,
            notes: true,
          },
          orderBy: { paidAt: 'asc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            type: true,
            status: true,
            total: true,
            invoiceDate: true,
          },
          orderBy: { invoiceDate: 'asc' },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found in cortanasoft');
    }
    const total = Number(order.total);
    const paidAmount = Number(order.paidAmount);
    return {
      success: true,
      financials: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        currency: order.currency?.code || null,
        amounts: {
          total,
          subtotal: Number(order.subtotal),
          vat: Number(order.vatAmount),
          shipping: Number(order.shippingCost),
          discount: Number(order.discount),
          paid: paidAmount,
          remaining: Number((total - paidAmount).toFixed(2)),
          invoiced: Number(order.invoicedAmount),
          advanced: Number(order.advancedAmount),
        },
        payments: order.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paidAt: p.paidAt.toISOString(),
          method: p.method,
          reference: p.reference,
          notes: p.notes,
        })),
        invoices: order.invoices.map((inv) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          type: inv.type,
          status: inv.status,
          total: Number(inv.total),
          issuedAt: inv.invoiceDate.toISOString(),
        })),
      },
    };
  }
}
