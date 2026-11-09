import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptanceProtocolsService } from '../acceptance-protocols/acceptance-protocols.service';
import { AscertainmentProtocolsService } from '../ascertainment-protocols/ascertainment-protocols.service';

@Injectable()
export class ServiceProtocolsService {
  constructor(
    private prisma: PrismaService,
    private acceptanceProtocols: AcceptanceProtocolsService,
    private ascertainmentProtocols: AscertainmentProtocolsService,
  ) {}

  // ==================== Пълен контрол от сервизния екран ====================
  // Сервизните потребители работят с права service.orders (не erp.protocols),
  // затова create/get/update/cancel минават през тези service-scoped методи,
  // които делегират към протоколните services и пазят принадлежността
  // (протоколът трябва да е по СЪЩАТА сервизна заявка + компания).

  private async assertOrder(companyId: string, serviceOrderId: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, companyId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Сервизната заявка не е намерена');
  }

  private async assertOwnership(
    companyId: string,
    serviceOrderId: string,
    kind: 'acceptance' | 'ascertainment',
    protocolId: string,
  ) {
    const doc =
      kind === 'acceptance'
        ? await this.prisma.acceptanceProtocol.findFirst({
            where: { id: protocolId, companyId, serviceOrderId },
            select: { id: true },
          })
        : await this.prisma.ascertainmentProtocol.findFirst({
            where: { id: protocolId, companyId, serviceOrderId },
            select: { id: true },
          });
    if (!doc) {
      throw new NotFoundException('Протоколът не е намерен по тази заявка');
    }
  }

  async createCustom(
    companyId: string,
    serviceOrderId: string,
    userId: string | undefined,
    kind: 'acceptance' | 'ascertainment',
    dto: any,
  ) {
    await this.assertOrder(companyId, serviceOrderId);
    const payload = { ...dto, serviceOrderId };
    return kind === 'acceptance'
      ? this.acceptanceProtocols.create(companyId, userId || '', payload)
      : this.ascertainmentProtocols.create(companyId, userId || '', payload);
  }

  async getOne(
    companyId: string,
    serviceOrderId: string,
    kind: 'acceptance' | 'ascertainment',
    protocolId: string,
  ) {
    await this.assertOwnership(companyId, serviceOrderId, kind, protocolId);
    return kind === 'acceptance'
      ? this.acceptanceProtocols.findOne(companyId, protocolId)
      : this.ascertainmentProtocols.findOne(companyId, protocolId);
  }

  async updateCustom(
    companyId: string,
    serviceOrderId: string,
    kind: 'acceptance' | 'ascertainment',
    protocolId: string,
    dto: any,
  ) {
    await this.assertOwnership(companyId, serviceOrderId, kind, protocolId);
    return kind === 'acceptance'
      ? this.acceptanceProtocols.update(companyId, protocolId, dto)
      : this.ascertainmentProtocols.update(companyId, protocolId, dto);
  }

  async cancelCustom(
    companyId: string,
    serviceOrderId: string,
    kind: 'acceptance' | 'ascertainment',
    protocolId: string,
  ) {
    await this.assertOwnership(companyId, serviceOrderId, kind, protocolId);
    return kind === 'acceptance'
      ? this.acceptanceProtocols.cancel(companyId, protocolId)
      : this.ascertainmentProtocols.cancel(companyId, protocolId);
  }

  // Всички документи по заявката: приемо-предавателни, констативни и
  // стокови разписки (разписката няма отделен PDF от сервизния екран).
  async listForOrder(companyId: string, serviceOrderId: string) {
    const [acceptance, ascertainment, stockReceipts] = await Promise.all([
      this.prisma.acceptanceProtocol.findMany({
        where: { companyId, serviceOrderId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentNumber: true,
          documentDate: true,
          status: true,
          serviceKind: true,
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
      this.prisma.stockReceipt.findMany({
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
    ]);

    return [
      ...acceptance.map((p) => ({
        ...p,
        subject: null,
        kind: 'acceptance' as const,
      })),
      ...ascertainment.map((p) => ({
        ...p,
        serviceKind: null,
        kind: 'ascertainment' as const,
      })),
      ...stockReceipts.map((p) => ({
        ...p,
        subject: null,
        serviceKind: null,
        kind: 'stockReceipt' as const,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
