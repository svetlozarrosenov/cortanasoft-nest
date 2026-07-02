import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * ЗАГОТОВКА за интеграцията с Евротръст (https://evrotrust.com) —
 * квалифициран доставчик на удостоверителни услуги по eIDAS.
 *
 * Планирани услуги (по договорка с Евротръст, все още неактивна):
 *   1. Отдалечен КЕП/УЕП — документът се праща през REST API, потребителят
 *      получава push в приложението Evrotrust и подписва; резултатът се
 *      връща по webhook. Покрива чл. 7, ал. 4 (КЕП на работодателя) и
 *      AES/QES за служителите (чл. 7, ал. 2–3).
 *   2. Електронно връчване (QERDS) — доказуемо връчване по чл. 4, ал. 4 от
 *      наредбата с презумпция по чл. 43, § 2 eIDAS.
 *   3. Квалифицирани времеви печати — чл. 12, ал. 3 от наредбата.
 *
 * Конфигурация през env: EVROTRUST_API_URL, EVROTRUST_VENDOR_API_KEY.
 * Докато не са зададени, isConfigured() е false и UI-ят показва опциите
 * като „очаква активиране"; методите хвърлят ясна грешка при опит.
 */
@Injectable()
export class EvrotrustService {
  private readonly logger = new Logger(EvrotrustService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.EVROTRUST_API_URL && process.env.EVROTRUST_VENDOR_API_KEY,
    );
  }

  private notConfigured(): never {
    throw new ServiceUnavailableException(
      'Интеграцията с Евротръст още не е активирана.',
    );
  }

  /**
   * TODO(evrotrust): изпращане на документ за отдалечено подписване.
   * Очакван flow: POST /document/doc → връща transactionId; Евротръст праща
   * push към приложението на подписващия (идентифициран по ЕГН/телефон);
   * статусът се обновява през webhook или GET /document/status.
   */
  async createSignatureRequest(_params: {
    fileName: string;
    content: Buffer;
    signerIdentifier: string; // ЕГН или телефон, с който е регистриран в Evrotrust
    level: 'AES' | 'QES';
  }): Promise<{ transactionId: string }> {
    this.notConfigured();
  }

  /** TODO(evrotrust): проверка на статус на подписване по transactionId. */
  async getSignatureStatus(_transactionId: string): Promise<{
    status: 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
    signedContent?: Buffer;
  }> {
    this.notConfigured();
  }

  /**
   * TODO(evrotrust): електронно връчване (QERDS) на документ до служител —
   * заменя вътрешното push/имейл уведомяване с доказуемо връчване.
   */
  async deliverDocument(_params: {
    fileName: string;
    content: Buffer;
    recipientIdentifier: string;
  }): Promise<{ deliveryId: string }> {
    this.notConfigured();
  }

  /** TODO(evrotrust): квалифициран времеви печат върху хеш (чл. 12, ал. 3). */
  async timestamp(_sha256Hex: string): Promise<{ token: string }> {
    this.notConfigured();
  }
}
