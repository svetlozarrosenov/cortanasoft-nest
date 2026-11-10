import {
  assertSafePublicUrl,
  isCompanyFileKey,
  isPrivateIp,
} from './safe-url';

describe('safe-url', () => {
  it('flags private, loopback and metadata addresses', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.5',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:10.0.0.1',
    ]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp('8.8.8.8')).toBe(false);
  });

  it('rejects internal and non-http URLs', async () => {
    await expect(
      assertSafePublicUrl('http://169.254.169.254/metadata/v1/'),
    ).rejects.toThrow();
    await expect(assertSafePublicUrl('http://127.0.0.1:3001/')).rejects.toThrow();
    await expect(assertSafePublicUrl('http://[::1]/')).rejects.toThrow();
    await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertSafePublicUrl('not a url')).rejects.toThrow();
    await expect(assertSafePublicUrl('https://8.8.8.8/x')).resolves.toBeUndefined();
  });

  it('accepts only file keys of the same company', () => {
    expect(isCompanyFileKey('bank-statements/c1/a.pdf', 'c1')).toBe(true);
    expect(isCompanyFileKey('invoices/c1/sub/a.pdf', 'c1')).toBe(true);
    expect(isCompanyFileKey('bank-statements/c2/a.pdf', 'c1')).toBe(false);
    expect(isCompanyFileKey('bank-statements/c1/../c2/a.pdf', 'c1')).toBe(false);
    expect(isCompanyFileKey('http://evil.test/c1/a.pdf', 'c1')).toBe(false);
    expect(isCompanyFileKey('/bank-statements/c1/a.pdf', 'c1')).toBe(false);
    expect(isCompanyFileKey('c1/a.pdf', 'c1')).toBe(false);
    expect(isCompanyFileKey('', 'c1')).toBe(false);
  });
});
