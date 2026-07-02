import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

const EXPIRY_HORIZON_DAYS = 30;

@Injectable()
export class EmployeeRecordsCronService {
  private readonly logger = new Logger(EmployeeRecordsCronService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
  ) {}

  /**
   * Веднъж дневно: уведомява HR за срочни договори, които изтичат в следващите
   * 30 дни. expiryNotifiedAt пази срещу повторни нотификации. Само за компании
   * с включен модул + push нотификации.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyExpiringFixedTermContracts() {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + EXPIRY_HORIZON_DAYS);

    const contracts = await this.prisma.employmentContract.findMany({
      where: {
        type: 'FIXED_TERM',
        status: 'ACTIVE',
        expiryNotifiedAt: null,
        endDate: { not: null, gte: now, lte: horizon },
        company: {
          employeeRecordsEnabled: true,
          pushNotificationsEnabled: true,
        },
      },
      select: { id: true, number: true, endDate: true, companyId: true },
    });

    if (contracts.length === 0) return;
    this.logger.log(`${contracts.length} expiring fixed-term contract(s) to notify`);

    // Групиране по компания
    const byCompany = new Map<string, typeof contracts>();
    for (const c of contracts) {
      const arr = byCompany.get(c.companyId) || [];
      arr.push(c);
      byCompany.set(c.companyId, arr);
    }

    for (const [companyId, list] of byCompany) {
      const hrUserIds = await this.hrUserIds(companyId);
      if (hrUserIds.length === 0) continue; // няма кого да уведомим → пробваме пак утре

      for (const c of list) {
        const dateStr = c.endDate
          ? new Date(c.endDate).toLocaleDateString('bg-BG')
          : '';
        try {
          await this.pushService.sendToUsers(hrUserIds, {
            title: 'Изтичащ срочен трудов договор',
            body: `Договор ${c.number} изтича на ${dateStr}`,
            url: `/dashboard/${companyId}/hr/employee-records`,
            tag: `contract-expiry-${c.id}`,
            data: { type: 'employment_contract_expiry', contractId: c.id },
          });
        } catch (err) {
          this.logger.error(`Push failed for contract ${c.id}`, err as Error);
        }
      }

      await this.prisma.employmentContract.updateMany({
        where: { id: { in: list.map((c) => c.id) } },
        data: { expiryNotifiedAt: new Date() },
      });
    }
  }

  /** Потребители в компанията с право да виждат трудови досиета. */
  private async hrUserIds(companyId: string): Promise<string[]> {
    const ucs = await this.prisma.userCompany.findMany({
      where: { companyId },
      select: { userId: true, role: { select: { permissions: true } } },
    });
    return ucs
      .filter((uc) => {
        const p = uc.role?.permissions as any;
        return (
          p?.modules?.employeeRecords?.pages?.dossiers?.actions?.view === true
        );
      })
      .map((uc) => uc.userId);
  }
}
