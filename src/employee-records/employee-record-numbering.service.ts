import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type DocKind = 'contract' | 'annex' | 'order' | 'submission';

const CONFIG: Record<
  DocKind,
  { prefix: string; model: string; field?: string }
> = {
  contract: { prefix: 'TD', model: 'employmentContract' },
  annex: { prefix: 'AX', model: 'employmentAnnex' },
  order: { prefix: 'ZP', model: 'employmentOrder' },
  // Входящ регистър (чл. 9 от наредбата) — regNumber вместо number
  submission: { prefix: 'VH', model: 'employeeSubmission', field: 'regNumber' },
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
    const { prefix, model, field = 'number' } = CONFIG[kind];
    const year = new Date().getFullYear();
    const full = `${prefix}-${year}-`;

    const last = await (tx as any)[model].findFirst({
      where: { companyId, [field]: { startsWith: full } },
      orderBy: { [field]: 'desc' },
      select: { [field]: true },
    });

    const lastNum = last ? parseInt(last[field].slice(full.length), 10) : 0;
    const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
    return `${full}${next.toString().padStart(5, '0')}`;
  }
}
