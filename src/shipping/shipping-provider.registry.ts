import { Injectable, Logger, OnModuleInit, SetMetadata } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ShippingProvider } from './interfaces';

export const SHIPPING_CARRIER_META = 'shipping:carrier';

/**
 * Маркира сервиз като куриер. Класът трябва да имплементира ShippingProvider
 * и да е provider в модул, импортиран в AppModule. Регистърът го открива
 * при старт — не се добавя никъде на ръка.
 */
export const ShippingCarrier = () => SetMetadata(SHIPPING_CARRIER_META, true);

/**
 * Регистър на куриерите (Strategy + Registry). Общият код пита регистъра
 * „кой клас отговаря за провайдър X" и „кои куриери са включени за
 * фирмата", без да изброява конкретни куриери.
 */
@Injectable()
export class ShippingProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ShippingProviderRegistry.name);
  private readonly providers = new Map<string, ShippingProvider>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    for (const wrapper of this.discovery.getProviders()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;
      const isCarrier = this.reflector.get<boolean>(
        SHIPPING_CARRIER_META,
        metatype,
      );
      if (!isCarrier) continue;
      const provider = instance as ShippingProvider;
      if (!provider.name) {
        this.logger.warn(`Куриер без name: ${metatype.name}`);
        continue;
      }
      this.providers.set(provider.name, provider);
    }
    this.logger.log(
      `Куриери: ${[...this.providers.keys()].join(', ') || 'няма'}`,
    );
  }

  get(name: string): ShippingProvider | undefined {
    return this.providers.get(name);
  }

  all(): ShippingProvider[] {
    return [...this.providers.values()];
  }

  /** Куриерите с активна конфигурация за фирмата (за списъци и меню). */
  async enabledFor(companyId: string): Promise<ShippingProvider[]> {
    const checks = await Promise.all(
      this.all().map(async (p) =>
        (await p.isConfigured(companyId)) ? p : null,
      ),
    );
    return checks.filter((p): p is ShippingProvider => p !== null);
  }
}
