import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptanceProtocolsService } from '../acceptance-protocols/acceptance-protocols.service';
import { AscertainmentProtocolsService } from '../ascertainment-protocols/ascertainment-protocols.service';

type ProtocolKind = 'intake' | 'handover' | 'ascertainment';

@Injectable()
export class ServiceProtocolsService {
  constructor(
    private prisma: PrismaService,
    private acceptanceProtocols: AcceptanceProtocolsService,
    private ascertainmentProtocols: AscertainmentProtocolsService,
  ) {}

  async issue(
    companyId: string,
    serviceOrderId: string,
    userId: string | undefined,
    kind: ProtocolKind,
    extra?: { findings?: string; conclusion?: string; commissionMembers?: string[] },
  ) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, companyId },
      include: { customer: true, asset: true, parts: { include: { product: true } }, labor: true },
    });
    if (!order) {
      throw new NotFoundException('Сервизната заявка не е намерена');
    }

    const customer = order.customer;
    const recipientName =
      customer.companyName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Клиент';

    if (kind === 'ascertainment') {
      const findings = extra?.findings || order.diagnosis || '';
      const conclusion = extra?.conclusion || order.workPerformed || '';
      if (!findings) {
        throw new BadRequestException(
          'Преди констативен протокол въведете диагноза в заявката',
        );
      }

      return this.ascertainmentProtocols.create(companyId, userId || '', {
        customerId: customer.id,
        recipientName,
        recipientEik: customer.eik || undefined,
        recipientAddress: customer.address || undefined,
        recipientCity: customer.city || undefined,
        subject: `Сервизна заявка ${order.orderNumber}${order.asset ? ` · ${order.asset.name}` : ''}`,
        findings,
        conclusion,
        commissionMembers: extra?.commissionMembers || [],
        serviceOrderId: order.id,
      });
    }

    const isIntake = kind === 'intake';
    const assetLine = order.asset
      ? `${order.asset.name}${order.asset.brand ? ' ' + order.asset.brand : ''}${
          order.asset.model ? ' ' + order.asset.model : ''
        }${order.asset.serialNumber ? ', сериен номер: ' + order.asset.serialNumber : ''}`
      : 'Устройство';

    const items = isIntake
      ? [
          {
            description:
              `${assetLine}\nОписание: ${order.customerComplaint}` +
              (order.accessories ? `\nАксесоари: ${order.accessories}` : '') +
              (order.cosmeticState ? `\nВъншен вид: ${order.cosmeticState}` : ''),
            quantity: 1,
            unitPrice: 0,
            vatRate: 0,
          },
        ]
      : [
          ...order.parts.map((p) => ({
            productId: p.productId,
            description: p.product?.name || 'Резервна част',
            quantity: Number(p.quantity),
            unitPrice: Number(p.unitPrice),
            vatRate: 20,
          })),
          ...order.labor.map((l) => ({
            description: `Труд: ${l.description} (${Number(l.hours)}ч)`,
            quantity: 1,
            unitPrice: Number(l.totalPrice),
            vatRate: 20,
          })),
          {
            description:
              `${assetLine}\nИзвършена работа: ${order.workPerformed || '—'}`,
            quantity: 1,
            unitPrice: 0,
            vatRate: 0,
          },
        ];

    return this.acceptanceProtocols.create(companyId, userId || '', {
      customerId: customer.id,
      recipientName,
      recipientEik: customer.eik || undefined,
      recipientAddress: customer.address || undefined,
      recipientCity: customer.city || undefined,
      serviceOrderId: order.id,
      notes: `${isIntake ? 'Приемен' : 'Предавателен'} протокол по сервизна заявка ${order.orderNumber}`,
      items,
    });
  }

  async listForOrder(companyId: string, serviceOrderId: string) {
    const [acceptance, ascertainment] = await Promise.all([
      this.prisma.acceptanceProtocol.findMany({
        where: { companyId, serviceOrderId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentNumber: true,
          documentDate: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.ascertainmentProtocol.findMany({
        where: { companyId, serviceOrderId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentNumber: true,
          documentDate: true,
          status: true,
          subject: true,
          createdAt: true,
        },
      }),
    ]);

    return [
      ...acceptance.map((p) => ({ ...p, kind: 'acceptance' as const })),
      ...ascertainment.map((p) => ({ ...p, kind: 'ascertainment' as const })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
