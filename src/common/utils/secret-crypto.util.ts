import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

// AES-256-GCM шифроване за тайни в базата (Еконт/Спиди пароли, Anthropic
// ключове, 2FA ключове, ЕГН, Google Analytics service account, Meta Pixel
// токен). ЕДИНСТВЕНИЯТ helper за това — не копирай логиката по модулите.
//
// Ключове:
// - ENCRYPTION_KEY          — текущият ключ; с него се ШИФРОВА всичко ново.
// - ENCRYPTION_KEY_PREVIOUS — по избор, само за ДЕШИФРИРАНЕ по време на
//                             ротация. След `node dist/src/cli/reencrypt-secrets.js`
//                             се маха.
// В production ENCRYPTION_KEY е задължителен (assertEncryptionKeyConfigured в
// main.ts). Локално, ако липсва, се ползва JWT_SECRET с предупреждение — така
// беше исторически и прод данните до ротацията са шифровани именно с него.
//
// Формат: 'enc:v1:' + base64(iv[12] + authTag[16] + ciphertext). Трите модула
// (analytics-google, meta-pixel, employee-records) преди пишеха същото без
// префикса — decryptSecret чете и двата варианта, CLI-то ги уеднаквява.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:v1:';

export type EncryptionKeySource = 'ENCRYPTION_KEY' | 'JWT_SECRET';

let warnedFallback = false;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/** Откъде идва текущият ключ (за startup проверка и CLI). */
export function encryptionKeySource(): EncryptionKeySource | null {
  if (process.env.ENCRYPTION_KEY) return 'ENCRYPTION_KEY';
  if (process.env.JWT_SECRET) return 'JWT_SECRET';
  return null;
}

/**
 * В production спира приложението при липсващ ENCRYPTION_KEY — по-добре
 * ясна грешка при старт, отколкото тайни, шифровани с ключа за сесиите.
 */
export function assertEncryptionKeyConfigured(): void {
  const source = encryptionKeySource();
  if (source === 'ENCRYPTION_KEY') return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY is required in production (separate from JWT_SECRET). ' +
        'See deploy/README.md — key rotation.',
    );
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      source === 'JWT_SECRET'
        ? '[secret-crypto] ENCRYPTION_KEY is not set — falling back to JWT_SECRET (dev only)'
        : '[secret-crypto] Neither ENCRYPTION_KEY nor JWT_SECRET is set — encryption will fail',
    );
  }
}

function primaryKey(): Buffer {
  const source = encryptionKeySource();
  if (!source) {
    throw new Error('Missing ENCRYPTION_KEY for credential encryption');
  }
  if (source === 'JWT_SECRET') assertEncryptionKeyConfigured(); // throws in prod
  return deriveKey(process.env[source] as string);
}

/** Текущ ключ + предишен (ако има) — в този ред се пробват при четене. */
function decryptionKeys(): Buffer[] {
  const keys = [primaryKey()];
  const previous = process.env.ENCRYPTION_KEY_PREVIOUS;
  if (previous) keys.push(deriveKey(previous));
  return keys;
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX);
}

function encryptWith(key: Buffer, plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptWith(key: Buffer, payloadBase64: string): string {
  const buf = Buffer.from(payloadBase64, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted payload is too short');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}

function payloadOf(value: string): string {
  return isEncryptedSecret(value) ? value.slice(PREFIX.length) : value;
}

/** Пробва ключовете поред; хвърля грешката от последния. */
function decryptWithAnyKey(payloadBase64: string): string {
  let lastError: unknown;
  for (const key of decryptionKeys()) {
    try {
      return decryptWith(key, payloadBase64);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to decrypt secret with the configured keys');
}

export function encryptSecret(plaintext: string): string {
  return encryptWith(primaryKey(), plaintext);
}

/**
 * Строго четене: стойността ТРЯБВА да е шифрована — с префикс или в стария
 * формат без префикс (analytics-google/meta-pixel/ЕГН). Хвърля при повреда.
 */
export function decryptSecret(value: string): string {
  return decryptWithAnyKey(payloadOf(value));
}

/**
 * Легаси-толерантно четене: шифровано → дешифрира; plaintext (отпреди
 * шифроването, напр. стари Еконт пароли) → връща както си е.
 */
export function decryptSecretIfNeeded(value: string): string {
  if (!isEncryptedSecret(value)) return value;
  return decryptWithAnyKey(payloadOf(value));
}

/**
 * Може ли стойността да се прочете САМО с текущия ключ (без previous)?
 * Ползва се от CLI-то за ротация, за да прескача вече презаписаните редове.
 */
export function isEncryptedWithCurrentKey(value: string): boolean {
  try {
    decryptWith(primaryKey(), payloadOf(value));
    return true;
  } catch {
    return false;
  }
}
