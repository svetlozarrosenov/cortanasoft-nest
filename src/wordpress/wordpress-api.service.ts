import { Injectable, Logger } from '@nestjs/common';
import { WordPressRequestOptions } from './interfaces';

@Injectable()
export class WordPressApiService {
  private readonly logger = new Logger(WordPressApiService.name);

  private buildBaseUrl(options: WordPressRequestOptions): string {
    const protocol = options.mode === 'test' ? 'http' : 'https';
    return `${protocol}://${options.domain}`;
  }

  /**
   * Изпраща product sync към custom CortanaSoft WP плъгин endpoint.
   * POST /wp-json/cortanasoft/v1/product
   */
  async syncProduct(
    options: WordPressRequestOptions,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const url = `${this.buildBaseUrl(options)}/wp-json/cortanasoft/v1/product`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': options.apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(
          `WP product sync failed: ${response.status} — ${body.slice(0, 200)}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`WP product sync error: ${error.message}`);
      return false;
    }
  }

  /**
   * Тества връзката с WordPress сайта.
   * GET /wp-json/cortanasoft/v1/ping
   */
  async testConnection(options: WordPressRequestOptions): Promise<boolean> {
    const url = `${this.buildBaseUrl(options)}/wp-json/cortanasoft/v1/ping`;

    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': options.apiKey },
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
