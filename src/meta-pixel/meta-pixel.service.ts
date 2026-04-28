import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveMetaPixelConfigDto } from './dto';

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

    const data = { scriptHtml, pixelId, isActive };
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
