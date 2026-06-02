import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type DocKind = 'contract' | 'annex' | 'order';

const CONFIG: Record<DocKind, { prefix: string; model: string }> = {
  contract: { prefix: 'TD', model: 'employmentContract' },
  annex: { prefix: 'AX', model: 'employmentAnnex' },
  order: { prefix: 'ZP', model: 'employmentOrder' },
};

@Injectable()
export class EmployeeRecordNumberingService {
  /**
   * Генерира пореден номер за вид трудов документ в рамките на компания+година,
   * напр. TD-2026-00001. Извиква се вътре в $transaction за да избегне race.
   */
  async next(
    kind: DocKind,
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const { prefix, model } = CONFIG[kind];
    const year = new Date().getFullYear();
    const full = `${prefix}-${year}-`;

    const last = await (tx as any)[model].findFirst({
      where: { companyId, number: { startsWith: full } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const lastNum = last ? parseInt(last.number.slice(full.length), 10) : 0;
    const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
    return `${full}${next.toString().padStart(5, '0')}`;
  }
}
