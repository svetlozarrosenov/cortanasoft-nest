import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveMetaPixelConfigDto } from './dto';
import { decryptSecret, encryptSecret } from './crypto.util';

export interface ResolvedEventConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string | null;
  isActive: boolean;
}

@Injectable()
export class MetaPixelService {
  private readonly logger = new Logger(MetaPixelService.name);

  constructor(private prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.metaPixelConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config) return null;
    return {
      id: config.id,
      scriptHtml: config.scriptHtml,
      pixelId: config.pixelId,
      hasAccessToken: !!config.accessTokenEncrypted,
      testEventCode: config.testEventCode,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async getPublicScript(): Promise<{ scriptHtml: string; pixelId: string | null } | null> {
    const config = await this.prisma.metaPixelConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config || !config.isActive) return null;
    return { scriptHtml: config.scriptHtml, pixelId: config.pixelId };
  }

  // Internal use by MetaPixelEventsService — decrypts token и връща всичко нужно за CAPI call.
  async getEventConfig(): Promise<ResolvedEventConfig | null> {
    const config = await this.prisma.metaPixelConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!config || !config.isActive) return null;
    if (!config.pixelId || !config.accessTokenEncrypted) return null;

    let accessToken: string;
    try {
      accessToken = decryptSecret(config.accessTokenEncrypted);
    } catch (err) {
      this.logger.error('Failed to decrypt Meta Pixel access token', err);
      return null;
    }

    return {
      pixelId: config.pixelId,
      accessToken,
      testEventCode: config.testEventCode,
      isActive: config.isActive,
    };
  }

  async saveConfig(dto: SaveMetaPixelConfigDto) {
    const scriptHtml = dto.scriptHtml.trim();
    if (!scriptHtml) {
      throw new BadRequestException('Скриптът не може да е празен');
    }
    if (!/<script[\s>]/i.test(scriptHtml)) {
      throw new BadRequestException('Очаква се пълен <script> блок от Meta Events Manager');
    }

    const pixelId = this.extractPixelId(scriptHtml);
    const existing = await this.prisma.metaPixelConfig.findFirst();
    const isActive = dto.isActive ?? true;

    // Access token: ако е подаден непразен → encrypt и презапиши; иначе пази съществуващия.
    let accessTokenEncrypted: string | null = existing?.accessTokenEncrypted ?? null;
    if (dto.accessToken !== undefined) {
      const trimmedToken = dto.accessToken.trim();
      if (trimmedToken) {
        accessTokenEncrypted = encryptSecret(trimmedToken);
      }
    }

    // Test event code: undefined = не пипай; '' или null = изтрий; иначе → запази.
    let testEventCode: string | null = existing?.testEventCode ?? null;
    if (dto.testEventCode !== undefined) {
      const trimmed = dto.testEventCode?.trim() || '';
      testEventCode = trimmed || null;
    }

    const data = {
      scriptHtml,
      pixelId,
      accessTokenEncrypted,
      testEventCode,
      isActive,
    };
    const saved = existing
      ? await this.prisma.metaPixelConfig.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.metaPixelConfig.create({ data });

    return {
      id: saved.id,
      scriptHtml: saved.scriptHtml,
      pixelId: saved.pixelId,
      hasAccessToken: !!saved.accessTokenEncrypted,
      testEventCode: saved.testEventCode,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteConfig() {
    const existing = await this.prisma.metaPixelConfig.findFirst();
    if (!existing) return { success: true };
    await this.prisma.metaPixelConfig.delete({ where: { id: existing.id } });
    return { success: true };
  }

  // Извлича Pixel ID от стандартния fbq('init', '<id>') call.
  private extractPixelId(scriptHtml: string): string | null {
    const match = scriptHtml.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,20})['"]/);
    return match ? match[1] : null;
  }
}
