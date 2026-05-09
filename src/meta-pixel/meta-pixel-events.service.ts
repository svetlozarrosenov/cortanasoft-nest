import { Injectable, Logger } from '@nestjs/common';
import { MetaPixelService } from './meta-pixel.service';

// SDK-то няма официални TS типове, затова го import-ваме като any и го wrap-ваме тук.
// Auto-hash-ва email/phone/имена със SHA-256 lowercase trim преди send.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const bizSdk = require('facebook-nodejs-business-sdk');
const { ServerEvent, EventRequest, UserData, CustomData, FacebookAdsApi } = bizSdk;

export type CapiEventName = 'Lead' | 'Contact' | 'ViewContent' | 'CompleteRegistration';

export interface SendCapiEventInput {
  eventName: CapiEventName;
  // UUID, споделен с browser Pixel-а през fbq()'s { eventID } за дедупликация.
  eventId: string;
  // Опц. URL на страницата, от която event-ът е иницииран.
  eventSourceUrl?: string;
  // Request enrichment (server-side). Без тях match quality пада драстично.
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  // PII (auto-hashed от SDK). Празни → не се пращат.
  email?: string;
  phone?: string;
  // Custom data за filter-и в Custom Audiences. Currently само content_name.
  contentName?: string;
}

@Injectable()
export class MetaPixelEventsService {
  private readonly logger = new Logger(MetaPixelEventsService.name);

  constructor(private metaPixelService: MetaPixelService) {}

  /**
   * Fire-and-forget. Логва грешки, не блокира caller-а.
   * Връща промис главно за тестване / explicit await където е нужно.
   */
  async sendEvent(input: SendCapiEventInput): Promise<void> {
    let config;
    try {
      config = await this.metaPixelService.getEventConfig();
    } catch (err) {
      this.logger.error('Failed to load Meta Pixel CAPI config', err);
      return;
    }
    if (!config) {
      // CAPI не е конфигуриран (липсва accessToken или Pixel е inactive). Тихо skip.
      return;
    }

    try {
      FacebookAdsApi.init(config.accessToken);

      const userData = new UserData()
        .setClientIpAddress(input.ip || undefined)
        .setClientUserAgent(input.userAgent || undefined);
      if (input.email) userData.setEmails([input.email]);
      if (input.phone) userData.setPhones([this.normalizePhone(input.phone)]);
      if (input.fbp) userData.setFbp(input.fbp);
      if (input.fbc) userData.setFbc(input.fbc);

      const customData = new CustomData();
      if (input.contentName) customData.setContentName(input.contentName);

      const serverEvent = new ServerEvent()
        .setEventName(input.eventName)
        .setEventTime(Math.floor(Date.now() / 1000))
        .setEventId(input.eventId)
        .setActionSource('website')
        .setUserData(userData)
        .setCustomData(customData);
      if (input.eventSourceUrl) serverEvent.setEventSourceUrl(input.eventSourceUrl);

      const eventRequest = new EventRequest(config.accessToken, config.pixelId).setEvents([
        serverEvent,
      ]);
      if (config.testEventCode) {
        eventRequest.setTestEventCode(config.testEventCode);
      }

      const response = await eventRequest.execute();
      this.logger.log(
        `CAPI ${input.eventName} sent (event_id=${input.eventId}, fbtrace=${response?.fbtrace_id ?? 'n/a'})`,
      );
    } catch (err) {
      this.logger.error(
        `Meta CAPI send failed for event=${input.eventName} id=${input.eventId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // E.164-ish normalization: strip всичко освен цифри. SDK хешира това.
  private normalizePhone(phone: string): string {
    return phone.replace(/\D+/g, '');
  }
}
