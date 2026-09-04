import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness/readiness endpoint за външен uptime мониторинг (UptimeRobot,
 * DO Uptime, Grafana synthetic). Без guard-ове — не връща нищо чувствително.
 *
 * 200 → процесът е жив И базата отговаря на SELECT 1.
 * 503 → базата не отговаря (или отговаря по-бавно от DB_CHECK_TIMEOUT_MS).
 *
 * `version` е git SHA-то на build-а (APP_VERSION от Docker build-arg) — така
 * веднага се вижда кой deploy върви на прод.
 */
const DB_CHECK_TIMEOUT_MS = 3000;

export interface HealthReport {
  status: 'ok' | 'error';
  db: 'ok' | 'down';
  dbLatencyMs: number | null;
  uptimeSec: number;
  version: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const report = await this.buildReport();
    if (report.status !== 'ok') {
      res.status(503);
    }
    return report;
  }

  async buildReport(): Promise<HealthReport> {
    const started = Date.now();
    let db: HealthReport['db'] = 'ok';
    let dbLatencyMs: number | null = null;

    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`, DB_CHECK_TIMEOUT_MS);
      dbLatencyMs = Date.now() - started;
    } catch {
      db = 'down';
    }

    return {
      status: db === 'ok' ? 'ok' : 'error',
      db,
      dbLatencyMs,
      uptimeSec: Math.round(process.uptime()),
      version: process.env.APP_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  // Prisma няма per-query timeout — ако пулът е изчерпан, заявката виси
  // до pool_timeout. Тук режем по-рано, за да върнем 503 вместо да висим.
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DB check timed out')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
}
