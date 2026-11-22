import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import {
  CreateSaleDto,
  DeviceSaleDto,
  JobResultDto,
  QueryPosProductsDto,
  QueryPosSerialsDto,
} from './dto';
import { buildReceiptLines, SaleItem, vatGroupFor } from './receipt-lines';
import { ONLINE_WINDOW_MS, PosEventsService } from './pos-events.service';

/** A sale the register has not picked up after this long is withdrawn. */
const PENDING_TTL_MS = 90_000;
/** A register that took a sale and went silent for this long: outcome unknown. */
const SENT_TTL_MS = 15 * 60_000;
/** Longest time a register's request for work is held open. */
const MAX_WAIT_MS = 25_000;

const OPEN_STATUSES = ['PENDING', 'SENT'] as const;
/** Most units of one product offered for picking at once. */
const MAX_SERIALS = 200;

const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  unit: true,
  type: true,
  salePrice: true,
  vatRate: true,
} as const;

type PosProductRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SELECT;
}>;

/** A product as the cashier's screen shows it. */
const toPosProduct = (product: PosProductRow) => {
  const net = Number(product.salePrice);
  const vatRate = Number(product.vatRate);
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    vatRate,
    // Without VAT, as the sale will be priced: the screen totals its lines
    // from this, the same way the receipt and the order are
    unitPrice: net,
    // What the customer pays for one unit
    price: Math.round(net * (100 + vatRate)) / 100,
    // False when the register would refuse it: no price, or no VAT group
    sellable: net > 0 && vatGroupFor(vatRate) !== null,
    // Kept by serial number: the cashier says which unit is sold
    hasSerials: product.type === 'SERIAL',
  };
};

/**
 * Units that can be sold now: in stock and not already on a live sale (a
 * returned or cancelled sale keeps its number for history, but frees it).
 */
const sellableSerials = (
  companyId: string,
  locationId: string | null | undefined,
): Prisma.InventorySerialWhereInput => ({
  companyId,
  status: 'IN_STOCK',
  orderItems: {
    none: { order: { status: { notIn: ['CANCELLED', 'RETURNED'] } } },
  },
  ...(locationId && { locationId }),
});

// Short labels the register prints next to the quantity (up to 6 characters)
const UNIT_LABELS: Record<string, string> = {
  PIECE: 'бр.',
  KG: 'кг',
  G: 'г',
  L: 'л',
  ML: 'мл',
  M: 'м',
  CM: 'см',
  M2: 'м2',
  M3: 'м3',
  PACK: 'оп.',
  BOX: 'кут.',
  SET: 'к-т',
  HOUR: 'ч',
};

const JOB_SELECT = {
  id: true,
  status: true,
  stage: true,
  paymentMethod: true,
  total: true,
  receiptNumber: true,
  receiptDateTime: true,
  card: true,
  errorCode: true,
  errorMessage: true,
  orderError: true,
  createdAt: true,
  finishedAt: true,
  order: { select: { id: true, orderNumber: true, status: true } },
  device: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  /** Registers currently waiting for work, by device id. */
  private readonly waiting = new Map<string, Set<() => void>>();

  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private events: PosEventsService,
  ) {}

  // ---- For the cashier's screen ----

  async listDevices(companyId: string) {
    const devices = await this.prisma.fiscalDevice.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        lastSeenAt: true,
        location: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    const now = Date.now();
    return devices.map((device) => {
      const age = device.lastSeenAt
        ? now - device.lastSeenAt.getTime()
        : Infinity;
      // What this process saw itself is fresher than the stored time: it
      // knows at once when a register hangs up. After a restart it has seen
      // nothing yet and goes by the stored time, watching from there on.
      let online = this.events.isOnline(device.id);
      if (online === undefined) {
        online = age < ONLINE_WINDOW_MS;
        if (online) {
          this.events.seen(device.id, companyId, ONLINE_WINDOW_MS - age);
        }
      }
      return { ...device, online };
    });
  }

  listCategories(companyId: string) {
    return this.prisma.productCategory.findMany({
      where: { companyId, products: { some: { isActive: true } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listProducts(companyId: string, query: QueryPosProductsDto) {
    // % and _ are what the cashier typed, not wildcards
    const search = query.search?.trim().replace(/[\\%_]/g, '\\$&');
    const page = query.page ?? 1;
    const limit = query.limit ?? 40;
    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
        ],
      }),
    };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      data: products.map(toPosProduct),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * The units of a product the cashier can pick from, or the one unit with a
   * scanned serial number. Only what is in the register's own store is shown.
   */
  async listSerials(companyId: string, query: QueryPosSerialsDto) {
    const serialNumber = query.serialNumber?.trim();
    if (!query.productId && !serialNumber) {
      throw new BadRequestException('productId or serialNumber is required');
    }
    const device = query.deviceId
      ? await this.prisma.fiscalDevice.findFirst({
          where: { id: query.deviceId, companyId },
          select: { locationId: true },
        })
      : null;
    const serials = await this.prisma.inventorySerial.findMany({
      where: {
        ...sellableSerials(companyId, device?.locationId),
        product: { isActive: true },
        ...(query.productId && { productId: query.productId }),
        ...(serialNumber && {
          serialNumber: { equals: serialNumber, mode: 'insensitive' },
        }),
      },
      select: {
        id: true,
        serialNumber: true,
        product: { select: PRODUCT_SELECT },
      },
      orderBy: { serialNumber: 'asc' },
      take: MAX_SERIALS,
    });
    return serials.map((serial) => ({
      id: serial.id,
      serialNumber: serial.serialNumber,
      product: toPosProduct(serial.product),
    }));
  }

  /** Prices the sale from the products and hands it to the register. */
  async createSale(companyId: string, userId: string, dto: CreateSaleDto) {
    const device = await this.prisma.fiscalDevice.findFirst({
      where: { id: dto.deviceId, companyId, status: 'ACTIVE' },
      select: { id: true, locationId: true },
    });
    if (!device) throw new NotFoundException('Fiscal device not found');

    await this.settleStaleJobs(device.id);

    const ids = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, companyId, isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        type: true,
        salePrice: true,
        vatRate: true,
      },
    });
    if (products.length !== ids.length) {
      throw new BadRequestException({
        message: 'Some products are no longer available',
        code: 'POS_PRODUCT_UNAVAILABLE',
      });
    }
    const byId = new Map(products.map((product) => [product.id, product]));

    // A product kept by serial number is sold one unit per line, and the
    // unit must be one the register's store really has.
    const serialLines = dto.items.filter(
      (line) => byId.get(line.productId)!.type === 'SERIAL',
    );
    const missing = serialLines.find(
      (line) => !line.serialId || line.quantity !== 1,
    );
    if (missing) {
      throw new BadRequestException({
        message: 'A serial number must be chosen for each unit',
        code: 'POS_SERIAL_REQUIRED',
        details: { product: byId.get(missing.productId)!.name },
      });
    }
    const serialIds = serialLines.map((line) => line.serialId!);
    const serials = await this.prisma.inventorySerial.findMany({
      where: {
        ...sellableSerials(companyId, device.locationId),
        id: { in: serialIds },
      },
      select: { id: true, serialNumber: true, productId: true },
    });
    const serialById = new Map(serials.map((serial) => [serial.id, serial]));
    const unavailable =
      new Set(serialIds).size !== serialIds.length ||
      serialLines.some(
        (line) => serialById.get(line.serialId!)?.productId !== line.productId,
      );
    if (unavailable) {
      throw new BadRequestException({
        message: 'A chosen serial number is no longer available',
        code: 'POS_SERIAL_UNAVAILABLE',
      });
    }

    const items: SaleItem[] = dto.items.map((line) => {
      const product = byId.get(line.productId)!;
      const serial =
        product.type === 'SERIAL' ? serialById.get(line.serialId!) : undefined;
      return {
        productId: product.id,
        name: product.name,
        quantity: line.quantity,
        unitPrice: Number(product.salePrice),
        vatRate: Number(product.vatRate),
        unit: UNIT_LABELS[product.unit],
        ...(serial && {
          inventorySerialId: serial.id,
          serialNumber: serial.serialNumber,
        }),
      };
    });
    const { lines, total } = buildReceiptLines(items);
    if (total <= 0) {
      throw new BadRequestException({
        message: 'The sale has no amount to pay',
        code: 'POS_ZERO_TOTAL',
      });
    }

    // The cashier is shown one amount and asked to confirm it; a price
    // changed since the receipt was put together must not slip through.
    if (
      dto.expectedTotal !== undefined &&
      Math.round(dto.expectedTotal * 100) !== Math.round(total * 100)
    ) {
      throw new ConflictException({
        message: 'A price has changed since the receipt was put together',
        code: 'POS_TOTAL_CHANGED',
        details: { total },
      });
    }

    // One sale at a time per register. The check and the insert share a
    // lock on the device, so two requests arriving together cannot both
    // pass it and both be printed.
    const job = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${device.id}))`;
      const busy = await tx.fiscalJob.count({
        where: { deviceId: device.id, status: { in: [...OPEN_STATUSES] } },
      });
      if (busy > 0) {
        throw new ConflictException({
          message: 'The cash register is busy with another sale',
          code: 'POS_DEVICE_BUSY',
        });
      }
      return tx.fiscalJob.create({
        data: {
          paymentMethod: dto.paymentMethod,
          total,
          items: items as unknown as Prisma.InputJsonValue,
          receiptLines: lines as unknown as Prisma.InputJsonValue,
          deviceId: device.id,
          createdById: userId,
          companyId,
        },
        select: JOB_SELECT,
      });
    });
    this.wake(device.id);
    this.settleLater(job.id, device.id, PENDING_TTL_MS);
    return job;
  }

  async getSale(companyId: string, id: string) {
    const found = await this.prisma.fiscalJob.findFirst({
      where: { id, companyId },
      select: { deviceId: true },
    });
    if (!found) throw new NotFoundException('Sale not found');
    await this.settleStaleJobs(found.deviceId);
    return this.prisma.fiscalJob.findUniqueOrThrow({
      where: { id },
      select: JOB_SELECT,
    });
  }

  /** Withdraws a sale the register has not started on. */
  async cancelSale(companyId: string, id: string) {
    const cancelled = await this.prisma.fiscalJob.updateMany({
      where: { id, companyId, status: 'PENDING' },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
    if (cancelled.count !== 1) {
      const exists = await this.prisma.fiscalJob.count({
        where: { id, companyId },
      });
      if (!exists) throw new NotFoundException('Sale not found');
      throw new ConflictException({
        message: 'The cash register has already started on this sale',
        code: 'POS_ALREADY_STARTED',
      });
    }
    await this.publishSale(id);
    return this.getSale(companyId, id);
  }

  /**
   * The electronic copy of the fiscal receipt a sale was printed with: the
   * text the register read back from its electronic journal. Null for a sale
   * that did not go through a register, or whose copy could not be read.
   */
  async orderReceipt(companyId: string, orderId: string) {
    const job = await this.prisma.fiscalJob.findFirst({
      where: {
        companyId,
        orderId,
        status: 'SUCCEEDED',
        receiptText: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        receiptNumber: true,
        receiptDateTime: true,
        fiscalMemoryNumber: true,
        receiptText: true,
        total: true,
        device: { select: { name: true, serialNumber: true } },
      },
    });
    if (!job) return null;
    const lines = job.receiptText!.split('\n');
    return {
      receiptNumber: job.receiptNumber,
      receiptDateTime: job.receiptDateTime,
      fiscalMemoryNumber: job.fiscalMemoryNumber,
      deviceName: job.device.name,
      deviceSerialNumber: job.device.serialNumber,
      lines,
      qr: await this.receiptQr(
        lines,
        job.fiscalMemoryNumber,
        Number(job.total),
      ),
    };
  }

  /**
   * The QR code of a fiscal receipt. The journal keeps the receipt as text
   * only, but the code holds nothing that is not in that text: fiscal memory
   * number, receipt number, date, time and amount, separated by "*". It is
   * printed right under the line with the receipt's number and date.
   */
  private async receiptQr(
    lines: string[],
    fiscalMemoryNumber: string | null,
    total: number,
  ) {
    const stamp =
      /^(\d{7})\s+(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})\s*$/;
    const afterLine = lines.findIndex((line) => stamp.test(line));
    if (afterLine < 0 || !fiscalMemoryNumber) return null;
    const [, number, day, month, year, time] = stamp.exec(lines[afterLine])!;
    const text = `${fiscalMemoryNumber}*${number}*${year}-${month}-${day}*${time}*${total.toFixed(2)}`;
    const image = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 0,
      scale: 8,
    });
    return { text, image, afterLine };
  }

  // ---- For the register ----

  /**
   * Gives the register its next sale, holding the request open for a while
   * when there is none so a new sale reaches it at once.
   */
  async nextJob(deviceId: string, waitMs: number, gone?: AbortSignal) {
    const claimed = await this.claim(deviceId);
    if (claimed || waitMs <= 0) return claimed;

    await new Promise<void>((resolve) => {
      const waiters = this.waiting.get(deviceId) ?? new Set<() => void>();
      this.waiting.set(deviceId, waiters);
      const done = () => {
        clearTimeout(timer);
        waiters.delete(done);
        if (waiters.size === 0) this.waiting.delete(deviceId);
        resolve();
      };
      const timer = setTimeout(done, Math.min(waitMs, MAX_WAIT_MS));
      waiters.add(done);
      gone?.addEventListener('abort', done, { once: true });
    });
    // Nobody is listening any more: leave the sale for the next request
    if (gone?.aborted) return null;
    return this.claim(deviceId);
  }

  async reportProgress(deviceId: string, id: string, stage: string) {
    const updated = await this.prisma.fiscalJob.updateMany({
      where: { id, deviceId, status: 'SENT' },
      data: { stage },
    });
    if (updated.count === 1) await this.publishSale(id);
    return { ok: true };
  }

  /**
   * Records the outcome. Safe to repeat: the register resends its report
   * until it is acknowledged, and only the first one has any effect.
   */
  async reportResult(deviceId: string, id: string, dto: JobResultDto) {
    const recorded = await this.prisma.fiscalJob.updateMany({
      where: { id, deviceId, status: { in: ['SENT', 'UNCLEAR'] } },
      data: {
        status: dto.status,
        stage: null,
        finishedAt: new Date(),
        receiptNumber: dto.receiptNumber ?? null,
        receiptDateTime: dto.receiptDateTime ?? null,
        fiscalMemoryNumber: dto.fiscalMemoryNumber ?? null,
        card: dto.card ?? Prisma.JsonNull,
        receiptText: dto.receiptText?.join('\n') ?? null,
        errorCode: dto.errorCode ?? null,
        errorMessage: dto.errorMessage ?? null,
      },
    });
    if (recorded.count === 1) {
      // The cashier sees the outcome at once, and the order a moment later
      await this.publishSale(id);
      if (dto.status === 'SUCCEEDED') {
        await this.recordOrder(id);
        await this.publishSale(id);
      }
    }
    return { ok: true };
  }

  /**
   * The whole catalogue for a register to keep, so it can sell without a
   * connection. Prices are without VAT: the register computes its lines the
   * same way buildReceiptLines does, so its totals match the orders.
   */
  async catalog(companyId: string) {
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
          salePrice: true,
          vatRate: true,
          categoryId: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.listCategories(companyId),
    ]);
    return {
      categories,
      products: products.map((product) => {
        const vatRate = Number(product.vatRate);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit: UNIT_LABELS[product.unit] ?? null,
          unitPrice: Number(product.salePrice).toFixed(2),
          vatRate,
          // null: the register cannot sell it (no VAT group for the rate)
          vatGroup: vatGroupFor(vatRate),
          categoryId: product.categoryId,
        };
      }),
    };
  }

  /**
   * Records a sale that was rung up and printed on the register itself. The
   * receipt already exists, so the prices are taken as the register sold them.
   */
  async recordDeviceSale(
    deviceId: string,
    companyId: string,
    dto: DeviceSaleDto,
  ) {
    const known = await this.prisma.fiscalJob.findFirst({
      where: { deviceId, deviceSaleId: dto.saleId },
      select: { id: true },
    });
    if (known) return { ok: true };

    const items: SaleItem[] = dto.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    }));
    // The register's clock is trusted for the past only: a sale is never
    // dated in the future.
    const now = new Date();
    const soldAt = dto.soldAt ? new Date(dto.soldAt) : now;
    let job: { id: string };
    try {
      job = await this.prisma.fiscalJob.create({
        data: {
          status: 'SUCCEEDED',
          createdAt: soldAt < now ? soldAt : now,
          deviceSaleId: dto.saleId,
          paymentMethod: dto.paymentMethod,
          total: dto.total,
          items: items as unknown as Prisma.InputJsonValue,
          receiptLines: [],
          receiptNumber: dto.receiptNumber,
          receiptDateTime: dto.receiptDateTime ?? null,
          fiscalMemoryNumber: dto.fiscalMemoryNumber ?? null,
          card: dto.card ?? Prisma.JsonNull,
          receiptText: dto.receiptText?.join('\n') ?? null,
          sentAt: new Date(),
          finishedAt: new Date(),
          deviceId,
          companyId,
        },
        select: { id: true },
      });
    } catch (error) {
      // The same report arriving twice at once: the other one records it
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { ok: true };
      }
      throw error;
    }
    await this.recordOrder(job.id);
    return { ok: true };
  }

  // ---- Internals ----

  private wake(deviceId: string) {
    this.waiting.get(deviceId)?.forEach((done) => done());
  }

  /** Tells the open cashier screens how a sale stands now. */
  private async publishSale(id: string) {
    const job = await this.prisma.fiscalJob.findUnique({
      where: { id },
      select: { ...JOB_SELECT, companyId: true },
    });
    if (!job) return;
    const { companyId, ...sale } = job;
    this.events.publish(companyId, { type: 'sale', sale });
  }

  /**
   * A sale nobody picks up, or one a register swallowed, ends by the clock
   * alone. The cashier's screen is told then, without having to ask.
   */
  private settleLater(id: string, deviceId: string, afterMs: number) {
    setTimeout(() => {
      this.settleStaleJobs(deviceId)
        .then(() => this.publishSale(id))
        .catch((error) =>
          this.logger.warn(`Sale ${id}: could not settle: ${error}`),
        );
    }, afterMs + 1000).unref();
  }

  /** Atomically takes the oldest waiting sale for a device. */
  private async claim(deviceId: string) {
    await this.settleStaleJobs(deviceId);
    // A sale handed to a connection that died on the way never reached the
    // register. It asks for work only when it holds none (it reports any
    // sale it has before asking), so a sale still marked as handed out is
    // given again, while the cashier is still waiting for it.
    const lost = await this.prisma.fiscalJob.findFirst({
      where: {
        deviceId,
        status: 'SENT',
        stage: null,
        createdAt: { gte: new Date(Date.now() - PENDING_TTL_MS) },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const next =
      lost ??
      (await this.prisma.fiscalJob.findFirst({
        where: { deviceId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }));
    if (!next) return null;
    if (!lost) {
      const taken = await this.prisma.fiscalJob.updateMany({
        where: { id: next.id, status: 'PENDING' },
        data: { status: 'SENT', sentAt: new Date() },
      });
      // Lost a race with a cancellation: nothing to do this round
      if (taken.count !== 1) return null;
      this.settleLater(next.id, deviceId, SENT_TTL_MS);
    }
    await this.publishSale(next.id);
    const job = await this.prisma.fiscalJob.findUniqueOrThrow({
      where: { id: next.id },
      select: {
        id: true,
        paymentMethod: true,
        total: true,
        receiptLines: true,
      },
    });
    return {
      id: job.id,
      paymentMethod: job.paymentMethod,
      total: Number(job.total).toFixed(2),
      lines: job.receiptLines,
    };
  }

  /**
   * A sale must never print long after the cashier gave up on it, and one a
   * register swallowed without an answer must be looked at by a person.
   */
  private async settleStaleJobs(deviceId: string) {
    const now = Date.now();
    await this.prisma.fiscalJob.updateMany({
      where: {
        deviceId,
        status: 'PENDING',
        createdAt: { lt: new Date(now - PENDING_TTL_MS) },
      },
      data: { status: 'EXPIRED', finishedAt: new Date() },
    });
    await this.prisma.fiscalJob.updateMany({
      where: {
        deviceId,
        status: 'SENT',
        sentAt: { lt: new Date(now - SENT_TTL_MS) },
      },
      data: { status: 'UNCLEAR', stage: null },
    });
  }

  /**
   * The receipt is printed, so the sale is real: record it as an order, take
   * the payment and deduct the stock. A failure here cannot undo the receipt;
   * it is kept on the job for a person to resolve.
   */
  private async recordOrder(jobId: string) {
    const job = await this.prisma.fiscalJob.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        device: { select: { name: true, locationId: true, pairedById: true } },
      },
    });
    try {
      // Nobody is signed in on the register itself: such a sale is entered
      // in the name of whoever paired the device.
      const userId = job.createdById ?? job.device.pairedById;
      if (!userId) throw new Error('No user to record the sale for');
      const items = job.items as unknown as SaleItem[];
      const locationId = job.device.locationId ?? undefined;
      const receipt = `Фискален бон № ${job.receiptNumber ?? '?'}`;

      // Sold on the register itself, which does not ask for serial numbers:
      // the order waits until somebody says which units left the store.
      const withoutSerial = await this.prisma.product.findMany({
        where: {
          companyId: job.companyId,
          type: 'SERIAL',
          id: {
            in: items
              .filter((item) => !item.inventorySerialId)
              .map((item) => item.productId),
          },
        },
        select: { name: true },
      });
      const serialNote = withoutSerial.length
        ? `. Липсва сериен номер: ${withoutSerial.map((p) => p.name).join(', ')}`
        : '';

      // A sale made on the register while it was offline belongs to the
      // day it was made, not to the day Cortana heard of it.
      const soldAt = job.deviceSaleId ? job.createdAt.toISOString() : undefined;

      const order = await this.orders.create(job.companyId, userId, {
        customerName: 'Краен клиент',
        orderDate: soldAt,
        locationId,
        paymentMethod: job.paymentMethod,
        notes: `${receipt}, ${job.device.name}${serialNote}`,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          locationId,
          inventorySerialId: item.inventorySerialId,
        })),
        payments: [
          {
            amount: Number(job.total),
            method: job.paymentMethod,
            reference: receipt,
            paidAt: soldAt,
          },
        ],
        // Deducts the stock; lines without stock become backorders
        autoConfirm: true,
      });
      if (Number(order.total) !== Number(job.total)) {
        this.logger.warn(
          `Sale ${order.orderNumber}: order total ${order.total} differs from receipt total ${job.total}`,
        );
      }

      // The goods left with the customer. Lines still waiting for stock keep
      // the sale in "awaiting fulfilment" instead. The order is linked to
      // the job only now, so the cashier's screen sees it in its final state.
      await this.orders
        .update(job.companyId, order.id, { status: 'DELIVERED' })
        .catch(() => undefined);
      await this.prisma.fiscalJob.update({
        where: { id: jobId },
        data: { orderId: order.id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fiscal job ${jobId}: receipt printed but no order: ${message}`,
      );
      await this.prisma.fiscalJob.update({
        where: { id: jobId },
        data: { orderError: message },
      });
    }
  }
}
