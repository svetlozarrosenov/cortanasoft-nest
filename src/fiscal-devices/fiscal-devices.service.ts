import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  createPublicKey,
  createVerify,
  randomInt,
  KeyObject,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePairingCodeDto, DeviceTokenDto, PairDeviceDto } from './dto';

// No 0/O, 1/I/L: the code is read off a screen and typed on a small keyboard.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000;

const CHALLENGE_TTL = '60s';
const TOKEN_TTL_SECONDS = 15 * 60;

const CHALLENGE_TYPE = 'fiscal-challenge';
export const DEVICE_TOKEN_TYPE = 'fiscal-device';

// Error codes the app on the register translates for the cashier
const CODE_INVALID = 'PAIRING_CODE_INVALID';
const DEVICE_REVOKED = 'DEVICE_REVOKED';
const DEVICE_AUTH_FAILED = 'DEVICE_AUTH_FAILED';

const DEVICE_SELECT = {
  id: true,
  name: true,
  serialNumber: true,
  fiscalMemoryNumber: true,
  model: true,
  appVersion: true,
  status: true,
  pairedAt: true,
  lastSeenAt: true,
  revokedAt: true,
  location: { select: { id: true, name: true } },
  pairedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** What an authenticated register is allowed to know about itself. */
export interface FiscalDeviceIdentity {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  locationName: string | null;
}

export function normalizePairingCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

function hashCode(code: string): string {
  return createHash('sha256').update(normalizePairingCode(code)).digest('hex');
}

function parsePublicKey(base64: string): KeyObject {
  try {
    const key = createPublicKey({
      key: Buffer.from(base64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    if (
      key.asymmetricKeyType !== 'ec' ||
      key.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
    ) {
      throw new Error('not P-256');
    }
    return key;
  } catch {
    throw new BadRequestException('Invalid device key');
  }
}

/** Checks an ECDSA P-256 / SHA-256 signature (DER, base64) over a text. */
function isSignedBy(key: KeyObject, text: string, signature: string): boolean {
  try {
    return createVerify('SHA256')
      .update(text)
      .verify(key, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

@Injectable()
export class FiscalDevicesService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ---- For the company's administrators ----

  findAll(companyId: string) {
    return this.prisma.fiscalDevice.findMany({
      where: { companyId },
      select: DEVICE_SELECT,
      orderBy: [{ status: 'asc' }, { pairedAt: 'desc' }],
    });
  }

  /** Issues a one-time code. The plain code is returned once and never stored. */
  async createPairingCode(
    companyId: string,
    userId: string,
    dto: CreatePairingCodeDto,
  ) {
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
        select: { id: true },
      });
      if (!location) throw new NotFoundException('Location not found');
    }

    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.$transaction([
      // Spent and expired codes are of no further use
      this.prisma.fiscalPairingCode.deleteMany({
        where: {
          companyId,
          OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
        },
      }),
      this.prisma.fiscalPairingCode.create({
        data: {
          codeHash: hashCode(code),
          name: dto.name,
          expiresAt,
          locationId: dto.locationId || null,
          createdById: userId,
          companyId,
        },
      }),
    ]);

    return { code, expiresAt };
  }

  /** Cuts a device off: its key stops working at once. The row stays as history. */
  async revoke(companyId: string, id: string) {
    const device = await this.prisma.fiscalDevice.findFirst({
      where: { id, companyId },
      select: { id: true, status: true },
    });
    if (!device) throw new NotFoundException('Fiscal device not found');
    if (device.status === 'REVOKED') {
      return this.prisma.fiscalDevice.findUnique({
        where: { id },
        select: DEVICE_SELECT,
      });
    }
    return this.prisma.fiscalDevice.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
      select: DEVICE_SELECT,
    });
  }

  // ---- For the register itself ----

  async pair(dto: PairDeviceDto) {
    const key = parsePublicKey(dto.publicKey);
    const code = normalizePairingCode(dto.code);
    if (!isSignedBy(key, code, dto.signature)) {
      throw new BadRequestException('Invalid device key');
    }

    const serialNumber = dto.serialNumber.trim();

    const device = await this.prisma.$transaction(async (tx) => {
      // Claim the code atomically so two devices cannot use the same one
      const claimed = await tx.fiscalPairingCode.updateMany({
        where: {
          codeHash: hashCode(code),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException({
          message: 'The pairing code is wrong or has expired',
          code: CODE_INVALID,
        });
      }
      const pairing = await tx.fiscalPairingCode.findUniqueOrThrow({
        where: { codeHash: hashCode(code) },
      });

      // The same register paired again replaces its earlier registration
      await tx.fiscalDevice.updateMany({
        where: {
          companyId: pairing.companyId,
          serialNumber,
          status: 'ACTIVE',
        },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      return tx.fiscalDevice.create({
        data: {
          name: pairing.name,
          serialNumber,
          fiscalMemoryNumber: dto.fiscalMemoryNumber?.trim() || null,
          model: dto.model?.trim() || null,
          appVersion: dto.appVersion?.trim() || null,
          publicKey: dto.publicKey,
          lastSeenAt: new Date(),
          locationId: pairing.locationId,
          pairedById: pairing.createdById,
          companyId: pairing.companyId,
        },
        select: { id: true },
      });
    });

    return this.identity(device.id);
  }

  /** A short-lived text for the device to sign. Stateless: it is a signed token. */
  createChallenge(deviceId: string) {
    return {
      challenge: this.jwt.sign(
        { type: CHALLENGE_TYPE, sub: deviceId },
        { expiresIn: CHALLENGE_TTL },
      ),
    };
  }

  /** Exchanges a signed challenge for a short-lived access token. */
  async createToken(dto: DeviceTokenDto) {
    const failed = new UnauthorizedException({
      message: 'Device authentication failed',
      code: DEVICE_AUTH_FAILED,
    });

    let payload: { type?: string; sub?: string };
    try {
      payload = this.jwt.verify(dto.challenge);
    } catch {
      throw failed;
    }
    if (payload.type !== CHALLENGE_TYPE || payload.sub !== dto.deviceId) {
      throw failed;
    }

    const device = await this.prisma.fiscalDevice.findUnique({
      where: { id: dto.deviceId },
      select: {
        id: true,
        status: true,
        publicKey: true,
        serialNumber: true,
        companyId: true,
      },
    });
    if (!device) throw failed;
    if (device.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'This device has been disconnected',
        code: DEVICE_REVOKED,
      });
    }
    if (
      device.serialNumber !== dto.serialNumber.trim() ||
      !isSignedBy(
        parsePublicKey(device.publicKey),
        dto.challenge,
        dto.signature,
      )
    ) {
      throw failed;
    }

    await this.prisma.fiscalDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        ...(dto.appVersion && { appVersion: dto.appVersion.trim() }),
      },
    });

    return {
      token: this.jwt.sign(
        {
          type: DEVICE_TOKEN_TYPE,
          sub: device.id,
          companyId: device.companyId,
        },
        { expiresIn: TOKEN_TTL_SECONDS },
      ),
      expiresIn: TOKEN_TTL_SECONDS,
      device: await this.identity(device.id),
    };
  }

  /**
   * Resolves an access token to its device. The database is consulted every
   * time, so a revoked device is refused even while its token is still valid.
   */
  async authenticate(token: string): Promise<FiscalDeviceIdentity> {
    const failed = new UnauthorizedException({
      message: 'Device authentication failed',
      code: DEVICE_AUTH_FAILED,
    });
    let payload: { type?: string; sub?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw failed;
    }
    if (payload.type !== DEVICE_TOKEN_TYPE || !payload.sub) throw failed;

    const updated = await this.prisma.fiscalDevice.updateMany({
      where: { id: payload.sub, status: 'ACTIVE' },
      data: { lastSeenAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new UnauthorizedException({
        message: 'This device has been disconnected',
        code: DEVICE_REVOKED,
      });
    }
    return this.identity(payload.sub);
  }

  private async identity(deviceId: string): Promise<FiscalDeviceIdentity> {
    const device = await this.prisma.fiscalDevice.findUniqueOrThrow({
      where: { id: deviceId },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: { select: { name: true } },
        location: { select: { name: true } },
      },
    });
    return {
      id: device.id,
      name: device.name,
      companyId: device.companyId,
      companyName: device.company.name,
      locationName: device.location?.name ?? null,
    };
  }
}
