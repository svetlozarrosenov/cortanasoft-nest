import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Защита срещу SSRF: сървърът тегли по HTTP само от публични адреси.
 * Всяко `fetch` към адрес, който идва от потребител или от базата, минава
 * през `fetchPublicUrl` (или поне през `assertSafePublicUrl`).
 */

/** True if an IP literal is loopback, private, link-local or CGNAT. */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const v6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // ULA
  if (v6.startsWith('fe80')) return true; // link-local
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return false;
}

/**
 * Reject anything that isn't a plain http(s) URL resolving to a public IP,
 * so a caller can't make the server reach internal services / cloud metadata.
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Невалиден URL адрес');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('Разрешени са само http(s) адреси');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((r) => r.address);
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a))) {
    throw new BadRequestException('Достъпът до вътрешни адреси е забранен');
  }
}

/**
 * Тегли файл от публичен адрес: проверка на адреса, без следване на
 * пренасочвания (иначе публичен адрес може да прати към вътрешен) и таван
 * на размера. Връща null при неуспешен отговор.
 */
export async function fetchPublicUrl(
  rawUrl: string,
  maxBytes = 25 * 1024 * 1024,
): Promise<Buffer | null> {
  await assertSafePublicUrl(rawUrl);
  const res = await fetch(rawUrl, {
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok || !res.body) return null;

  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > maxBytes) {
    throw new BadRequestException('Файлът е твърде голям');
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res.body as any) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new BadRequestException('Файлът е твърде голям');
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Ключ на файл в хранилището, който принадлежи на фирмата. Ключовете са
 * `<папка>/<companyId>/<файл>` (виж UploadsService.uploadFile). Отхвърля
 * пълни адреси, `..` и ключове на друга фирма.
 */
export function isCompanyFileKey(key: string, companyId: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(key) || key.startsWith('/')) return false;
  const parts = key.split('/');
  if (parts.length < 3) return false;
  if (parts.some((p) => p === '' || p === '.' || p === '..')) return false;
  return parts[1] === companyId;
}

export function assertCompanyFileKey(key: string, companyId: string): void {
  if (!isCompanyFileKey(key, companyId)) {
    throw new BadRequestException('Невалиден файл');
  }
}
