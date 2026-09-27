import { createCipheriv, createHash, randomBytes } from 'crypto';
import * as mod from './secret-crypto.util';

// Помощник в стария формат на трите модулни helper-а (без префикс)
function legacyRawEncrypt(secret: string, plaintext: string): string {
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

describe('secret-crypto.util', () => {
  // Helper-ът чете env при всяко извикване — няма нужда от reload на модула
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_PREVIOUS;
    delete process.env.JWT_SECRET;
    process.env.ENCRYPTION_KEY = 'new-key';
  });
  afterAll(() => {
    process.env = env;
  });

  it('roundtrips with the prefixed format', () => {
    const enc = mod.encryptSecret('secret-value');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(mod.isEncryptedSecret(enc)).toBe(true);
    expect(mod.decryptSecret(enc)).toBe('secret-value');
    expect(mod.decryptSecretIfNeeded(enc)).toBe('secret-value');
    expect(mod.isEncryptedWithCurrentKey(enc)).toBe(true);
  });

  it('returns plaintext as-is from decryptSecretIfNeeded', () => {
    expect(mod.decryptSecretIfNeeded('plain-password')).toBe('plain-password');
  });

  it('reads the legacy unprefixed format', () => {
    const raw = legacyRawEncrypt('new-key', '8001011234');
    expect(mod.isEncryptedSecret(raw)).toBe(false);
    expect(mod.decryptSecret(raw)).toBe('8001011234');
  });

  it('falls back to ENCRYPTION_KEY_PREVIOUS for reading and reports it as not current', () => {
    process.env.ENCRYPTION_KEY = 'old-key';
    const encOld = mod.encryptSecret('rotate-me');
    process.env.ENCRYPTION_KEY = 'new-key';
    process.env.ENCRYPTION_KEY_PREVIOUS = 'old-key';
    expect(mod.decryptSecret(encOld)).toBe('rotate-me');
    expect(mod.isEncryptedWithCurrentKey(encOld)).toBe(false);
    const encNew = mod.encryptSecret('rotate-me');
    expect(mod.isEncryptedWithCurrentKey(encNew)).toBe(true);
  });

  it('fails when no configured key can read the value', () => {
    process.env.ENCRYPTION_KEY = 'old-key';
    const encOld = mod.encryptSecret('x');
    process.env.ENCRYPTION_KEY = 'new-key';
    expect(() => mod.decryptSecret(encOld)).toThrow();
  });

  it('refuses to work without ENCRYPTION_KEY, whatever JWT_SECRET is', () => {
    delete process.env.ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'jwt';
    expect(() => mod.assertEncryptionKeyConfigured()).toThrow(/ENCRYPTION_KEY/);
    expect(() => mod.encryptSecret('v')).toThrow(/ENCRYPTION_KEY/);
    expect(() => mod.decryptSecret('enc:v1:AAAA')).toThrow(/ENCRYPTION_KEY/);
  });
});
