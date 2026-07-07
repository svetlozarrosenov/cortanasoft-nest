import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  constants as cryptoConstants,
  createHash,
  createHmac,
  publicEncrypt,
} from 'crypto';

/**
 * Клиент за Евротръст (https://docs.evrotrust.com) — Web SDK идентификация
 * (Поток 1) + OTP eSign подписване по RefID (Поток 2).
 *
 * Активира се само с env креденшъли (isConfigured()). Потвърдено срещу
 * официалната спецификация Web SDK v1.0.24 + живи тестове (2026-07-06):
 *   ✓ OAuth /authorize/gettoken (JSON body, Bearer, 15 дни);
 *   ✓ enc-data: RSA-4096 + OPENSSL_PKCS1_PADDING → hex (по спецификация);
 *   ✓ redirect: reference_id + status(2/3) + unsuccess_reason / error (v1.0.24);
 *   ✓ vendor HMAC авторизация (200 на validaterefid).
 * Потвърдено и от официалните Postman колекции (2026-07-07): activate =
 * {vendorNumber, activationCode, transactionID}; data структурата за
 * offline/refid (dateExpire unix, preview, publicKey base64 PEM — НАШИЯТ ключ);
 * resend приема phone; getdata има includes селекция.
 * Оставащ TODO(evrotrust-test): шифърът на .enc файла при download
 * (декриптирането с EVROTRUST_OUR_PRIVATE_KEY се дописва при първия реален подпис).
 * ВАЖНО: redirect_url трябва да е РЕГИСТРИРАН при Евротръст предварително;
 * timestamp толерансът е ±1 минута — сървърният часовник да е NTP-синхронизиран.
 *
 * ENV:
 *   EVROTRUST_ENV=test|prod (default test)
 *   EVROTRUST_VENDOR_NUMBER, EVROTRUST_CLIENT_ID, EVROTRUST_CLIENT_SECRET
 *   EVROTRUST_WEBSDK_PUBLIC_KEY (PEM, base64 през env — с \n или base64 цялото)
 *   EVROTRUST_VENDOR_API_KEY
 *   EVROTRUST_CALLBACK_HOST (https host за webhook-а, напр. https://cortanasoft.com)
 */

const ENDPOINTS = {
  test: {
    websdk: 'https://et.test.websdk.iteco.bg/',
    oauth: 'https://et.test.auth.iteco.bg',
    vendor: 'https://et.test.iteco.bg/vendor',
  },
  prod: {
    websdk: 'https://webid.evrotrust.com/',
    oauth: 'https://oauth2.evrotrust.com',
    vendor: 'https://v.evrotrust.com/vendor',
  },
} as const;

export interface EvrotrustUserData {
  documentNumber?: string;
  firstNameLatin?: string;
  lastNameLatin?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface SendForSigningParams {
  referenceId: string;
  fileName: string;
  content: Buffer;
  mimeType?: string;
  user: {
    documentNumber: string;
    firstNameLatin: string;
    lastNameLatin: string;
    phone?: string;
    email?: string;
    language?: string;
  };
  description: string;
  // 1 = Qualified eSign (КЕП); 2 = Advanced върху квалифициран серт; 3 = Advanced
  certificateType: 1 | 2 | 3;
  signType?: 'PDF1' | 'PDF2' | 'PDF3' | 'CAD1' | 'CAD2';
  coverage?: number;
  // Срок за подписване в дни (dateExpire); по подразбиране 7
  expireDays?: number;
}

@Injectable()
export class EvrotrustService {
  private readonly logger = new Logger(EvrotrustService.name);

  // Кеш на OAuth токена (валиден 15 дни; пазим в паметта с буфер от 1 час)
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private get env() {
    return process.env.EVROTRUST_ENV === 'prod' ? 'prod' : 'test';
  }

  private get urls() {
    return ENDPOINTS[this.env];
  }

  private get vendorNumber() {
    return process.env.EVROTRUST_VENDOR_NUMBER || '';
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.EVROTRUST_VENDOR_NUMBER &&
        process.env.EVROTRUST_CLIENT_ID &&
        process.env.EVROTRUST_CLIENT_SECRET &&
        process.env.EVROTRUST_WEBSDK_PUBLIC_KEY &&
        process.env.EVROTRUST_VENDOR_API_KEY,
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Интеграцията с Евротръст още не е активирана.',
      );
    }
  }

  // ==================== OAuth (Web SDK) ====================

  /** Access token за Web SDK — кеширан (валиден 15 дни по документация). */
  async getAccessToken(): Promise<string> {
    this.assertConfigured();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${this.urls.oauth}/authorize/gettoken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        scope: 'websdk',
        client_id: process.env.EVROTRUST_CLIENT_ID,
        client_secret: process.env.EVROTRUST_CLIENT_SECRET,
      }),
    });
    if (!res.ok) {
      this.logger.error(`Evrotrust gettoken failed: ${res.status}`);
      throw new BadGatewayException('Евротръст: неуспешна авторизация');
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.tokenCache = {
      token: data.access_token,
      // Буфер от 1 час преди реалното изтичане
      expiresAt: Date.now() + Math.max(data.expires_in - 3600, 60) * 1000,
    };
    return data.access_token;
  }

  // ==================== Web SDK старт (Поток 1) ====================

  /**
   * Сглобява параметрите за браузърния POST към Evrotrust Web.
   * Frontend-ът прави auto-submit form с върнатите полета.
   */
  async buildIdentificationStart(params: {
    redirectUrl: string;
    externalReference: string; // уникален per user, ≤32 символа
    lang?: string;
    userPid?: string; // ЕГН за насрещна проверка (по избор)
    colorData?: Record<string, string>;
  }): Promise<{ url: string; fields: Record<string, string> }> {
    this.assertConfigured();
    const token = await this.getAccessToken();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

    const encPayload = JSON.stringify({
      lang: params.lang || 'bg',
      ...(params.userPid ? { user_pid: params.userPid } : {}),
      user_country: 'BG',
      redirect_url: params.redirectUrl,
      external_reference: params.externalReference.slice(0, 32),
      timestamp,
    });

    // enc-data: RSA-4096 + OPENSSL_PKCS1_PADDING → hex (спец. v1.0.24, Access)
    const encData = publicEncrypt(
      {
        key: this.websdkPublicKey(),
        padding: cryptoConstants.RSA_PKCS1_PADDING,
      },
      Buffer.from(encPayload, 'utf8'),
    ).toString('hex');

    const fields: Record<string, string> = {
      'vendor-number': this.vendorNumber,
      token,
      'enc-data': encData,
    };
    if (params.colorData) {
      fields['color-data'] = Buffer.from(
        JSON.stringify(params.colorData),
        'utf8',
      ).toString('base64');
    }

    return { url: this.urls.websdk, fields };
  }

  // ==================== Vendor API (HMAC авторизация) ====================

  /**
   * Authorization header за vendor API: HMAC-SHA256 върху ТОЧНИЯ JSON body,
   * с ключ SHA256(VENDOR_API_KEY), като lowercase hex.
   */
  private vendorAuthHeader(bodyJson: string): string {
    const keyDigest = createHash('sha256')
      .update(process.env.EVROTRUST_VENDOR_API_KEY || '', 'utf8')
      .digest();
    return createHmac('sha256', keyDigest)
      .update(bodyJson, 'utf8')
      .digest('hex');
  }

  private async vendorPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    this.assertConfigured();
    const bodyJson = JSON.stringify(body);
    const res = await fetch(`${this.urls.vendor}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.vendorAuthHeader(bodyJson),
      },
      body: bodyJson,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Evrotrust ${path} failed: ${res.status} ${text}`);
      throw new BadGatewayException(
        `Евротръст: грешка ${res.status} при ${path}`,
      );
    }
    return (await res.json()) as T;
  }

  // ==================== Поток 1: данни по RefID ====================

  async validateRefId(referenceId: string): Promise<{ valid: boolean } & Record<string, unknown>> {
    return this.vendorPost('/onetimeidentification/validaterefid', {
      vendorNumber: this.vendorNumber,
      referenceID: referenceId,
    });
  }

  /**
   * Данните трябва да се вземат до 2 часа след издаването на RefID.
   * Искаме САМО полетата, нужни за подписване (GDPR минимизация — без снимки).
   */
  async getUserData(referenceId: string): Promise<{ user: EvrotrustUserData } & Record<string, unknown>> {
    return this.vendorPost('/onetimeidentification/getdata', {
      vendorNumber: this.vendorNumber,
      referenceID: referenceId,
      includes: {
        names: true,
        latinNames: true,
        documentNumber: true,
        identificationNumber: true,
        documentValidDate: true,
      },
    });
  }

  // ==================== Поток 2: подписване по RefID ====================

  /**
   * Изпраща файл за еднократно подписване (OTP eSign). Връща transactionID,
   * с който се следи статусът (webhook /document/offline/ready или polling).
   */
  async sendDocumentForSigning(
    params: SendForSigningParams,
  ): Promise<{ transactionID: string } & Record<string, unknown>> {
    this.assertConfigured();

    // Структура по официалната Postman колекция (document-doc-offline-refid):
    // vendorNumber + document{description,dateExpire,coverage,preview,certificateType}
    // + signInfo + publicKey (НАШИЯТ ключ, base64 PEM — с него Евротръст криптира
    // резултата при download) + referenceID + user + urlCallback
    const dateExpire =
      Math.floor(Date.now() / 1000) + (params.expireDays ?? 7) * 86400;
    const data = {
      vendorNumber: this.vendorNumber,
      document: {
        description: params.description.slice(0, 4000),
        dateExpire,
        coverage: params.coverage ?? 0,
        preview: 0,
        certificateType: params.certificateType,
      },
      signInfo: {
        type: params.signType || 'PDF3',
        algorithm: 'SHA256',
      },
      ...(this.ourPublicKeyBase64()
        ? { publicKey: this.ourPublicKeyBase64() }
        : {}),
      referenceID: params.referenceId,
      user: {
        documentNumber: params.user.documentNumber,
        firstName: params.user.firstNameLatin,
        lastName: params.user.lastNameLatin,
        ...(params.user.phone ? { phone: params.user.phone } : {}),
        ...(params.user.email ? { email: params.user.email } : {}),
        language: params.user.language || 'bg',
      },
      ...(process.env.EVROTRUST_CALLBACK_HOST
        ? { urlCallback: process.env.EVROTRUST_CALLBACK_HOST }
        : {}),
    };
    const dataJson = JSON.stringify(data);

    const form = new FormData();
    form.append(
      'document',
      new Blob([new Uint8Array(params.content)], {
        type: params.mimeType || 'application/pdf',
      }),
      sanitizeFileName(params.fileName),
    );
    form.append('data', dataJson);

    const res = await fetch(`${this.urls.vendor}/document/doc/offline/refid`, {
      method: 'POST',
      headers: { Authorization: this.vendorAuthHeader(dataJson) },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Evrotrust send-for-signing failed: ${res.status} ${text}`);
      // 485/487 → невалиден/изтекъл RefID — сигнал за нова идентификация
      throw new BadGatewayException(
        res.status === 485 || res.status === 487
          ? 'EVROTRUST_REFID_INVALID'
          : `Евротръст: грешка ${res.status} при изпращане за подпис`,
      );
    }
    return (await res.json()) as { transactionID: string };
  }

  /**
   * Активира подписването със SMS кода, въведен от служителя в нашия UI.
   * Полето е "activationCode" (по официалната Postman колекция).
   */
  async activateSigning(
    transactionId: string,
    activationCode: string,
  ): Promise<Record<string, unknown>> {
    return this.vendorPost('/document/doc/offline/activate', {
      vendorNumber: this.vendorNumber,
      activationCode,
      transactionID: transactionId,
    });
  }

  async resendActivationSms(
    transactionId: string,
    phone?: string,
  ): Promise<Record<string, unknown>> {
    return this.vendorPost('/document/doc/offline/activate/resend', {
      vendorNumber: this.vendorNumber,
      transactionID: transactionId,
      ...(phone ? { phone } : {}),
    });
  }

  /** Polling fallback, когато webhook-ът не е стигнал. */
  async getDocumentStatus(
    transactionId: string,
  ): Promise<{ status: number } & Record<string, unknown>> {
    return this.vendorPost('/document/status', {
      vendorNumber: this.vendorNumber,
      transactionID: transactionId,
    });
  }

  /**
   * Сваля подписания документ: ZIP с .enc (криптиран файл) + .key (ключ,
   * криптиран с НАШИЯ публичен ключ). Връща суровия ZIP.
   * TODO(evrotrust-test): декриптиране (.key → RSA private decrypt → симетричен
   * шифър за .enc) — параметрите на шифъра се уточняват с тест достъпа.
   */
  async downloadSignedZip(transactionId: string): Promise<Buffer> {
    this.assertConfigured();
    const body = JSON.stringify({
      vendorNumber: this.vendorNumber,
      transactionID: transactionId,
    });
    const res = await fetch(`${this.urls.vendor}/document/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.vendorAuthHeader(body),
      },
      body,
    });
    if (!res.ok) {
      throw new BadGatewayException(
        `Евротръст: грешка ${res.status} при сваляне на подписания файл`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }

  /** НАШИЯТ публичен ключ, base64 на PEM — влиза в data.publicKey при подпис. */
  private ourPublicKeyBase64(): string | null {
    const raw = process.env.EVROTRUST_OUR_PUBLIC_KEY || '';
    if (!raw) {
      this.logger.warn(
        'EVROTRUST_OUR_PUBLIC_KEY липсва — download на подписания файл няма да може да се декриптира',
      );
      return null;
    }
    return raw; // очаква се вече base64 на целия PEM
  }

  private websdkPublicKey(): string {
    const raw = process.env.EVROTRUST_WEBSDK_PUBLIC_KEY || '';
    // Позволяваме и base64-кодиран PEM (по-удобно за env файлове)
    if (!raw.includes('BEGIN') && raw.length > 0) {
      return Buffer.from(raw, 'base64').toString('utf8');
    }
    return raw.replace(/\\n/g, '\n');
  }
}

// Ограниченията на Евротръст за име на файл: ≤100 символа, без <>:"\/|?*'!#$%&+=
function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"\\/|?*'!#$%&+= ]+/g, '_').slice(0, 100) || 'document.pdf';
}
