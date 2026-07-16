import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// AES-256-GCM шифроване за пароли/тайни в базата — същият механизъм като
// analytics-google/meta-pixel/employee-records crypto.util, но с版 префикс
// 'enc:v1:', за да може легаси plaintext стойности да се разпознават и
// шифроват лениво (без миграция на данни при deploy).
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  if (!secret) {
    throw new Error(
      'Missing ENCRYPTION_KEY (or JWT_SECRET fallback) for credential encryption',
    );
  }
  return createHash('sha256').update(secret).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

// Легаси-толерантно четене: шифровано → дешифрира; plaintext (отпреди
// шифроването) → връща както си е. Така старите записи работят до първото
// презаписване/самолечение.
export function decryptSecretIfNeeded(value: string): string {
  if (!isEncryptedSecret(value)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}
