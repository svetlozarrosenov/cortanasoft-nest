import { Injectable, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import {
  encryptSecret,
  decryptSecretIfNeeded,
} from '../common/utils/secret-crypto.util';
import {
  UpdateAiSettingsDto,
  DEFAULT_AI_MODEL,
} from './dto/update-ai-settings.dto';

// AI (Cortana) настройки per компания. Ключът на Anthropic се пази само
// шифрован и НИКОГА не напуска сървъра — навън отива само маскиран hint.
@Injectable()
export class AiSettingsService {
  constructor(private prisma: PrismaService) {}

  // Маскиран изглед за UI-а: има ли ключ + последните 4 знака
  private toSafeView(settings: {
    isActive: boolean;
    apiKey: string | null;
    model: string | null;
    updatedAt: Date;
  } | null) {
    if (!settings) {
      return {
        isActive: false,
        hasKey: false,
        keyHint: null,
        model: DEFAULT_AI_MODEL,
        updatedAt: null,
      };
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
      model: settings.model || DEFAULT_AI_MODEL,
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
    const data: { isActive?: boolean; apiKey?: string | null; model?: string } = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.model !== undefined) data.model = dto.model;
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

  /** Разшифрованият ключ + избраният модел за вътрешна употреба (document-ai
   *  и бъдещи AI функции). Връща null, ако AI не е настроен или е изключен. */
  async getAiConfigForCompany(
    companyId: string,
  ): Promise<{ apiKey: string; model: string } | null> {
    const settings = await this.prisma.aiSettings.findUnique({
      where: { companyId },
      select: { apiKey: true, isActive: true, model: true },
    });
    if (!settings?.apiKey || !settings.isActive) return null;
    try {
      return {
        apiKey: decryptSecretIfNeeded(settings.apiKey),
        model: settings.model || DEFAULT_AI_MODEL,
      };
    } catch {
      return null;
    }
  }

  async getApiKeyForCompany(companyId: string): Promise<string | null> {
    const config = await this.getAiConfigForCompany(companyId);
    return config?.apiKey ?? null;
  }

  // Проверка на връзката с реална (минимална) заявка към Anthropic със
  // записания ключ на компанията.
  async testConnection(companyId: string) {
    const config = await this.getAiConfigForCompany(companyId);
    if (!config) {
      throw new BadRequestException(
        'Няма записан API ключ или AI е изключен за тази компания',
      );
    }

    try {
      const client = new Anthropic({ apiKey: config.apiKey });
      // Тестваме с ИЗБРАНИЯ модел — ключ без достъп до него да се хване тук
      await client.messages.create({
        model: config.model,
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
