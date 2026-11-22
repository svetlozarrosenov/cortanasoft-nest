import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, createSign, generateKeyPairSync } from 'crypto';
import { FiscalDevicesService } from './fiscal-devices.service';
import { PrismaService } from '../prisma/prisma.service';

const COMPANY = 'company-1';
const SERIAL = 'DA000001';

// Stands in for the key pair a register keeps in its secure hardware
function deviceKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  return {
    publicKey: publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    sign: (text: string) =>
      createSign('SHA256').update(text).sign(privateKey).toString('base64'),
  };
}

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

describe('FiscalDevicesService', () => {
  let service: FiscalDevicesService;
  let prisma: any;
  let tx: any;

  beforeEach(async () => {
    tx = {
      fiscalPairingCode: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          name: 'Каса 1',
          locationId: null,
          createdById: 'user-1',
          companyId: COMPANY,
        }),
      },
      fiscalDevice: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'dev-1' }),
      },
    };
    prisma = {
      $transaction: jest.fn((arg: any) =>
        typeof arg === 'function' ? arg(tx) : Promise.all(arg),
      ),
      location: { findFirst: jest.fn() },
      fiscalPairingCode: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      fiscalDevice: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'dev-1',
          name: 'Каса 1',
          companyId: COMPANY,
          company: { name: 'Фирма' },
          location: null,
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        FiscalDevicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(FiscalDevicesService);
  });

  describe('createPairingCode', () => {
    it('returns the code once and stores only its hash', async () => {
      const { code } = await service.createPairingCode(COMPANY, 'user-1', {
        name: 'Каса 1',
      });

      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      const stored = prisma.fiscalPairingCode.create.mock.calls[0][0].data;
      expect(stored.codeHash).toBe(sha256(code));
      expect(JSON.stringify(stored)).not.toContain(code);
    });

    it('refuses a location of another company', async () => {
      prisma.location.findFirst.mockResolvedValue(null);
      await expect(
        service.createPairingCode(COMPANY, 'user-1', {
          name: 'Каса 1',
          locationId: 'foreign',
        }),
      ).rejects.toThrow('Location not found');
    });
  });

  describe('pair', () => {
    const request = (key = deviceKey(), code = 'ABCD2345') => ({
      code,
      publicKey: key.publicKey,
      signature: key.sign(code),
      serialNumber: SERIAL,
    });

    it('registers the device under the company that issued the code', async () => {
      const result = await service.pair(request());

      expect(tx.fiscalDevice.create.mock.calls[0][0].data).toMatchObject({
        name: 'Каса 1',
        serialNumber: SERIAL,
        companyId: COMPANY,
        pairedById: 'user-1',
      });
      expect(result).toMatchObject({ id: 'dev-1', companyName: 'Фирма' });
    });

    it('accepts the code as people type it: lower case, with separators', async () => {
      const key = deviceKey();
      await service.pair({
        ...request(key),
        code: 'abcd-2345',
      });
      expect(
        tx.fiscalPairingCode.updateMany.mock.calls[0][0].where.codeHash,
      ).toBe(sha256('ABCD2345'));
    });

    it('refuses a wrong, used or expired code', async () => {
      tx.fiscalPairingCode.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.pair(request())).rejects.toMatchObject({
        response: { code: 'PAIRING_CODE_INVALID' },
      });
      expect(tx.fiscalDevice.create).not.toHaveBeenCalled();
    });

    it('refuses a key the device cannot sign with', async () => {
      const other = deviceKey();
      await expect(
        service.pair({ ...request(), signature: other.sign('ABCD2345') }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('replaces an earlier registration of the same register', async () => {
      await service.pair(request());
      expect(tx.fiscalDevice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: COMPANY, serialNumber: SERIAL, status: 'ACTIVE' },
          data: expect.objectContaining({ status: 'REVOKED' }),
        }),
      );
    });
  });

  describe('createToken', () => {
    const key = deviceKey();
    const stored = (over: any = {}) => ({
      id: 'dev-1',
      status: 'ACTIVE',
      publicKey: key.publicKey,
      serialNumber: SERIAL,
      companyId: COMPANY,
      ...over,
    });
    const signedRequest = (signer = key, deviceId = 'dev-1') => {
      const { challenge } = service.createChallenge(deviceId);
      return {
        deviceId,
        challenge,
        signature: signer.sign(challenge),
        serialNumber: SERIAL,
      };
    };

    it('gives a token the guard accepts', async () => {
      prisma.fiscalDevice.findUnique.mockResolvedValue(stored());
      const { token, device } = await service.createToken(signedRequest());

      expect(device.companyId).toBe(COMPANY);
      await expect(service.authenticate(token)).resolves.toMatchObject({
        id: 'dev-1',
      });
    });

    it('refuses a signature made with another key', async () => {
      prisma.fiscalDevice.findUnique.mockResolvedValue(stored());
      await expect(
        service.createToken(signedRequest(deviceKey())),
      ).rejects.toMatchObject({ response: { code: 'DEVICE_AUTH_FAILED' } });
    });

    it('refuses a challenge issued for another device', async () => {
      prisma.fiscalDevice.findUnique.mockResolvedValue(stored());
      const request = signedRequest(key, 'dev-2');
      await expect(
        service.createToken({ ...request, deviceId: 'dev-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('refuses a different fiscal serial number', async () => {
      prisma.fiscalDevice.findUnique.mockResolvedValue(stored());
      await expect(
        service.createToken({ ...signedRequest(), serialNumber: 'XX999999' }),
      ).rejects.toMatchObject({ response: { code: 'DEVICE_AUTH_FAILED' } });
    });

    it('refuses a revoked device', async () => {
      prisma.fiscalDevice.findUnique.mockResolvedValue(
        stored({ status: 'REVOKED' }),
      );
      await expect(service.createToken(signedRequest())).rejects.toMatchObject({
        response: { code: 'DEVICE_REVOKED' },
      });
    });

    it('does not accept a challenge as an access token', async () => {
      const { challenge } = service.createChallenge('dev-1');
      await expect(service.authenticate(challenge)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('authenticate', () => {
    it('refuses a still-valid token once the device is revoked', async () => {
      const key = deviceKey();
      prisma.fiscalDevice.findUnique.mockResolvedValue({
        id: 'dev-1',
        status: 'ACTIVE',
        publicKey: key.publicKey,
        serialNumber: SERIAL,
        companyId: COMPANY,
      });
      const { challenge } = service.createChallenge('dev-1');
      const { token } = await service.createToken({
        deviceId: 'dev-1',
        challenge,
        signature: key.sign(challenge),
        serialNumber: SERIAL,
      });

      // The admin presses "Disconnect": no ACTIVE row matches any more
      prisma.fiscalDevice.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.authenticate(token)).rejects.toMatchObject({
        response: { code: 'DEVICE_REVOKED' },
      });
    });
  });
});
