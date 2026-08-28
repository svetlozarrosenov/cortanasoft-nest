import { Injectable, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import {
  encryptSecret,
  decryptSecretIfNeeded,
} from '../common/utils/secret-crypto.util';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

// AI (Cortana) настройки per компания. Ключът на Anthropic се пази само
// шифрован и НИКОГА не напуска сървъра — навън отива само маскиран hint.
@Injectable()
export class AiSettingsService {
  constructor(private prisma: PrismaService) {}

  // Маскиран изглед за UI-а: има ли ключ + последните 4 знака
  private toSafeView(settings: {
    isActive: boolean;
    apiKey: string | null;
    updatedAt: Date;
  } | null) {
    if (!settings) {
      return { isActive: false, hasKey: false, keyHint: null, updatedAt: null };
    }
    let keyHint: string | null = null;
    if (settings.apiKey) {
      try {
        const plain = decryptSecretIfNeeded(settings.apiKey);
        keyHint = `••••${plain.slice(-4)}`;
      } catch {
        keyHint = '••••';
      }
    }
    return {
      isActive: settings.isActive,
      hasKey: !!settings.apiKey,
      keyHint,
      updatedAt: settings.updatedAt,
    };
  }

  async getSettings(companyId: string) {
    const settings = await this.prisma.aiSettings.findUnique({
      where: { companyId },
    });
    return this.toSafeView(settings);
  }

  async updateSettings(companyId: string, dto: UpdateAiSettingsDto) {
    const data: { isActive?: boolean; apiKey?: string | null } = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.apiKey !== undefined) {
      // Празен string = изтриване на ключа; нов ключ се шифрова веднага
      data.apiKey = dto.apiKey ? encryptSecret(dto.apiKey.trim()) : null;
    }

    const settings = await this.prisma.aiSettings.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });
    return this.toSafeView(settings);
  }

  /** Разшифрованият ключ за вътрешна употреба (document-ai и бъдещи AI
   *  функции). Връща null, ако AI не е настроен или е изключен. */
  async getApiKeyForCompany(companyId: string): Promise<string | null> {
    const settings = await this.prisma.aiSettings.findUnique({
      where: { companyId },
      select: { apiKey: true, isActive: true },
    });
    if (!settings?.apiKey || !settings.isActive) return null;
    try {
      return decryptSecretIfNeeded(settings.apiKey);
    } catch {
      return null;
    }
  }

  // Проверка на връзката с реална (минимална) заявка към Anthropic със
  // записания ключ на компанията.
  async testConnection(companyId: string) {
    const apiKey = await this.getApiKeyForCompany(companyId);
    if (!apiKey) {
      throw new BadRequestException(
        'Няма записан API ключ или AI е изключен за тази компания',
      );
    }

    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: true };
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 401) {
        throw new BadRequestException(
          'Невалиден API ключ — Anthropic отказа удостоверяването',
        );
      }
      throw new BadRequestException(
        'Връзката с Anthropic не успя. Проверете ключа и опитайте отново.',
      );
    }
  }
}
