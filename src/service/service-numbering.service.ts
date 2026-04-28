import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Kind = 'order' | 'asset' | 'contract';

const PREFIX: Record<Kind, string> = {
  order: 'SRV',
  asset: 'ASSET',
  contract: 'SVC',
};

@Injectable()
export class ServiceNumberingService {
  constructor(private prisma: PrismaService) {}

  async next(
    kind: Kind,
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `${PREFIX[kind]}-${year}-`;

    let last:
      | { orderNumber?: string; assetNumber?: string; contractNumber?: string }
      | null = null;

    if (kind === 'order') {
      last = await client.serviceOrder.findFirst({
        where: { companyId, orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
    } else if (kind === 'asset') {
      last = await client.serviceAsset.findFirst({
        where: { companyId, assetNumber: { startsWith: prefix } },
        orderBy: { assetNumber: 'desc' },
        select: { assetNumber: true },
      });
    } else {
      last = await client.serviceContract.findFirst({
        where: { companyId, contractNumber: { startsWith: prefix } },
        orderBy: { contractNumber: 'desc' },
        select: { contractNumber: true },
      });
    }

    const lastValue =
      (last as any)?.orderNumber ||
      (last as any)?.assetNumber ||
      (last as any)?.contractNumber ||
      null;

    let nextNumber = 1;
    if (lastValue) {
      const parsed = parseInt(lastValue.split('-').pop() || '0', 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
