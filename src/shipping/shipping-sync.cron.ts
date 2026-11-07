import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShipmentSyncService } from './shipment-sync.service';

/**
 * Веднъж на час: статусите на отворените пратки от куриерите за фирмите с
 * включено „автоматично обновяване" (Настройки > куриер > Автоматизация).
 */
@Injectable()
export class ShippingSyncCron {
  private readonly logger = new Logger(ShippingSyncCron.name);
  private running = false;

  constructor(private readonly sync: ShipmentSyncService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncAll() {
    if (this.running) return; // предпазител при бавен куриер
    this.running = true;
    try {
      const companies = await this.sync.companiesWithAutoSync();
      for (const companyId of companies) {
        try {
          const r = await this.sync.syncCompany(companyId);
          if (r.checked > 0) {
            this.logger.log(
              `${companyId}: ${r.updated}/${r.checked} обновени` +
                (r.errors.length ? `, грешки: ${r.errors.length}` : ''),
            );
          }
        } catch (err) {
          this.logger.error(
            `${companyId}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
