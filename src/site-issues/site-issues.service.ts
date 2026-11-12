import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { assertCompanyMember, assertOwned } from '../common/utils/assert-owned';
import {
  CreateSiteIssueDto,
  UpdateSiteIssueDto,
  QuerySiteIssuesDto,
  ReturnSiteIssueDto,
  SiteIssueItemDto,
} from './dto';

const USER_SELECT = { id: true, firstName: true, lastName: true } as const;

const ISSUE_INCLUDE = {
  site: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  createdBy: { select: USER_SELECT },
  issuedBy: { select: USER_SELECT },
  items: {
    orderBy: { id: 'asc' },
    include: {
      product: {
        select: { id: true, name: true, sku: true, type: true, unit: true },
      },
      inventoryBatch: { select: { id: true, batchNumber: true } },
      inventorySerial: { select: { id: true, serialNumber: true } },
      allocations: {
        select: {
          id: true,
          quantity: true,
          returnedQty: true,
          batchNumber: true,
        },
      },
      // В кои активни продажби е влязло това количество
      orderItems: {
        where: { order: { status: { notIn: ['CANCELLED', 'RETURNED'] } } },
        select: {
          quantity: true,
          order: { select: { id: true, orderNumber: true } },
        },
      },
    },
  },
} satisfies Prisma.SiteIssueInclude;

type IssueWithItems = Prisma.SiteIssueGetPayload<{
  include: typeof ISSUE_INCLUDE;
}>;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Количеството от реда, което вече е в активни (незатворени) продажби. */
export function soldQty(item: {
  orderItems?: { quantity: unknown }[];
}): number {
  return round3(
    (item.orderItems ?? []).reduce((sum, oi) => sum + Number(oi.quantity), 0),
  );
}

/** Стойност на материалите на ред: (изписано − върнато) × цена на придобиване. */
export function issueItemCost(item: {
  quantity: unknown;
  returnedQty: unknown;
  unitCost: unknown;
}): number {
  return (
    (Number(item.quantity) - Number(item.returnedQty)) * Number(item.unitCost)
  );
}

/**
 * Изписване към обект: стока излиза от склада към обект без продажба.
 * Чернова не пипа склада; „Изписано" намалява наличността (избрана партида
 * или FEFO/FIFO, сериен номер → ON_SITE); връщане/анулиране възстановява
 * точно по записаните разпределения.
 */
@Injectable()
export class SiteIssuesService {
  constructor(private prisma: PrismaService) {}

  private async generateNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<string> {
    const prefix = `SI-${new Date().getFullYear()}-`;
    const last = await tx.siteIssue.findFirst({
      where: { companyId, issueNumber: { startsWith: prefix } },
      orderBy: { issueNumber: 'desc' },
      select: { issueNumber: true },
    });
    const next = last
      ? parseInt(last.issueNumber.split('-').pop() || '0', 10) + 1
      : 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  // Обект и склад на същата фирма; редовете — реални складови продукти.
  private async validate(
    companyId: string,
    dto: {
      siteId?: string;
      locationId?: string;
      issuedById?: string;
      items?: SiteIssueItemDto[];
    },
  ) {
    await assertCompanyMember(this.prisma, dto.issuedById, companyId);
    if (dto.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: dto.siteId, companyId },
        select: { id: true },
      });
      if (!site) throw new NotFoundException('Обектът не е намерен');
    }
    await assertOwned(this.prisma, 'location', dto.locationId, companyId);

    if (!dto.items) return;
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
      select: { id: true, name: true, type: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorMessages.inventory.productNotFound);
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const seenSerials = new Set<string>();
    for (const item of dto.items) {
      const product = byId.get(item.productId)!;
      if (product.type === 'SERVICE') {
        throw new BadRequestException(
          `„${product.name}" е услуга и не се изписва от склад`,
        );
      }
      if (product.type === 'SERIAL') {
        if (item.quantity !== 1) {
          throw new BadRequestException(
            `Сериен продукт „${product.name}" се изписва по един номер на ред`,
          );
        }
        if (item.inventorySerialId) {
          if (seenSerials.has(item.inventorySerialId)) {
            throw new BadRequestException(
              'Един и същ сериен номер е добавен два пъти',
            );
          }
          seenSerials.add(item.inventorySerialId);
          const serial = await this.prisma.inventorySerial.findFirst({
            where: {
              id: item.inventorySerialId,
              companyId,
              productId: item.productId,
            },
            select: { id: true },
          });
          if (!serial) {
            throw new NotFoundException(ErrorMessages.inventory.serialNotFound);
          }
        }
      } else if (item.inventorySerialId) {
        throw new BadRequestException(`„${product.name}" не е сериен продукт`);
      }
      await assertOwned(
        this.prisma,
        'inventoryBatch',
        item.inventoryBatchId,
        companyId,
        { productId: item.productId },
      );
    }
  }

  private itemsData(items: SiteIssueItemDto[]) {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      inventoryBatchId: item.inventoryBatchId || null,
      inventorySerialId: item.inventorySerialId || null,
    }));
  }

  async create(companyId: string, userId: string, dto: CreateSiteIssueDto) {
    await this.validate(companyId, dto);

    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.siteIssue.create({
          data: {
            issueNumber: await this.generateNumber(tx, companyId),
            issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
            notes: dto.notes?.trim() || null,
            companyId,
            siteId: dto.siteId,
            locationId: dto.locationId,
            createdById: userId,
            issuedById: dto.issuedById || userId,
            items: { create: this.itemsData(dto.items) },
          },
          include: ISSUE_INCLUDE,
        });
        if (!dto.issue) return created;
        return this.issueInTx(tx, companyId, created);
      },
      { timeout: 20000 },
    );
  }

  async findAll(companyId: string, query: QuerySiteIssuesDto) {
    const {
      search,
      status,
      siteId,
      locationId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.SiteIssueWhereInput = {
      companyId,
      ...(status && { status }),
      ...(siteId && { siteId }),
      ...(locationId && { locationId }),
      ...(dateFrom || dateTo
        ? {
            issueDate: {
              ...(dateFrom && { gte: new Date(dateFrom + 'T00:00:00.000Z') }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { issueNumber: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          {
            site: { name: { contains: search, mode: 'insensitive' as const } },
          },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.siteIssue.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          createdBy: { select: USER_SELECT },
          issuedBy: { select: USER_SELECT },
          items: {
            select: { quantity: true, returnedQty: true, unitCost: true },
          },
        },
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.siteIssue.count({ where }),
    ]);

    const data = rows.map(({ items, ...row }) => ({
      ...row,
      itemsCount: items.length,
      // Стойност по себестойност; при чернова цената още не е снимана → 0
      totalCost: round2(items.reduce((sum, i) => sum + issueItemCost(i), 0)),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string): Promise<IssueWithItems> {
    const issue = await this.prisma.siteIssue.findFirst({
      where: { id, companyId },
      include: ISSUE_INCLUDE,
    });
    if (!issue) throw new NotFoundException('Изписването не е намерено');
    return issue;
  }

  async update(companyId: string, id: string, dto: UpdateSiteIssueDto) {
    const issue = await this.findOne(companyId, id);
    if (issue.status !== 'DRAFT') {
      throw new BadRequestException(
        'Само чернова може да се редактира. Изписаното се връща или анулира.',
      );
    }
    await this.validate(companyId, dto);

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.items) {
          await tx.siteIssueItem.deleteMany({ where: { siteIssueId: id } });
        }
        const updated = await tx.siteIssue.update({
          where: { id },
          data: {
            ...(dto.siteId && { siteId: dto.siteId }),
            ...(dto.locationId && { locationId: dto.locationId }),
            ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
            ...(dto.issuedById && { issuedById: dto.issuedById }),
            ...(dto.notes !== undefined && {
              notes: dto.notes?.trim() || null,
            }),
            ...(dto.items && {
              items: { create: this.itemsData(dto.items) },
            }),
          },
          include: ISSUE_INCLUDE,
        });
        if (!dto.issue) return updated;
        return this.issueInTx(tx, companyId, updated);
      },
      { timeout: 20000 },
    );
  }

  async issue(companyId: string, id: string) {
    const issue = await this.findOne(companyId, id);
    return this.prisma.$transaction(
      (tx) => this.issueInTx(tx, companyId, issue),
      { timeout: 20000 },
    );
  }

  // Чернова → Изписано: намалява склада и снима себестойността по редове.
  private async issueInTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    issue: IssueWithItems,
  ) {
    if (issue.status !== 'DRAFT') {
      throw new BadRequestException('Само чернова може да бъде изписана');
    }
    if (issue.items.length === 0) {
      throw new BadRequestException('Изписването няма редове');
    }

    for (const item of issue.items) {
      const name = item.product.name;
      const quantity = Number(item.quantity);

      if (item.product.type === 'SERIAL') {
        if (!item.inventorySerialId) {
          throw new BadRequestException(
            ErrorMessages.inventory.serialRequired(name),
          );
        }
        const serial = await tx.inventorySerial.findFirst({
          where: {
            id: item.inventorySerialId,
            companyId,
            productId: item.productId,
          },
        });
        if (!serial) {
          throw new BadRequestException(ErrorMessages.inventory.serialNotFound);
        }
        if (
          serial.status !== 'IN_STOCK' ||
          serial.locationId !== issue.locationId
        ) {
          throw new BadRequestException(
            `${ErrorMessages.inventory.serialNotInStock}: „${name}" - SN: ${serial.serialNumber}`,
          );
        }
        // Условието по статус пази от двойно изписване при едновременни заявки
        const moved = await tx.inventorySerial.updateMany({
          where: { id: serial.id, status: 'IN_STOCK' },
          data: { status: 'ON_SITE' },
        });
        if (moved.count !== 1) {
          throw new BadRequestException(
            `${ErrorMessages.inventory.serialNotInStock}: „${name}" - SN: ${serial.serialNumber}`,
          );
        }
        await tx.siteIssueItem.update({
          where: { id: item.id },
          data: { unitCost: serial.unitCost },
        });
        continue;
      }

      // Складовите редове, от които се взима: избраната партида или FEFO/FIFO
      const batches = await tx.inventoryBatch.findMany({
        where: {
          companyId,
          productId: item.productId,
          locationId: issue.locationId,
          quantity: { gt: 0 },
          ...(item.inventoryBatchId && { id: item.inventoryBatchId }),
        },
        orderBy: [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'asc' },
        ],
      });
      const available = round3(
        batches.reduce((sum, b) => sum + Number(b.quantity), 0),
      );
      if (available < quantity) {
        throw new BadRequestException(
          `${ErrorMessages.inventory.insufficientStock}: „${name}" - ` +
            `налични: ${available}, заявени: ${quantity}`,
        );
      }

      let remaining = quantity;
      let costSum = 0;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = round3(Math.min(Number(batch.quantity), remaining));
        // gte в условието: ако друга заявка е изпреварила, не слизаме под нула
        const res = await tx.inventoryBatch.updateMany({
          where: { id: batch.id, quantity: { gte: take } },
          data: { quantity: { decrement: take } },
        });
        if (res.count !== 1) {
          throw new BadRequestException(
            `${ErrorMessages.inventory.insufficientStock}: „${name}"`,
          );
        }
        await tx.siteIssueAllocation.create({
          data: {
            siteIssueItemId: item.id,
            inventoryBatchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: take,
            unitCost: batch.unitCost,
          },
        });
        costSum += take * Number(batch.unitCost);
        remaining = round3(remaining - take);
      }
      await tx.siteIssueItem.update({
        where: { id: item.id },
        data: { unitCost: round4(costSum / quantity) },
      });
    }

    return tx.siteIssue.update({
      where: { id: issue.id },
      data: { status: 'ISSUED', issuedAt: new Date() },
      include: ISSUE_INCLUDE,
    });
  }

  // Връща количество от ред обратно в склада — по разпределенията, отзад
  // напред (последно взетото се връща първо).
  private async returnItemQty(
    tx: Prisma.TransactionClient,
    companyId: string,
    issue: { issueNumber: string; locationId: string },
    item: IssueWithItems['items'][number],
    qty: number,
  ) {
    if (item.product.type === 'SERIAL') {
      if (item.inventorySerialId) {
        await tx.inventorySerial.updateMany({
          where: { id: item.inventorySerialId, companyId, status: 'ON_SITE' },
          data: { status: 'IN_STOCK' },
        });
      }
    } else {
      const allocations = await tx.siteIssueAllocation.findMany({
        where: { siteIssueItemId: item.id },
        orderBy: { id: 'desc' },
      });
      let remaining = qty;
      for (const alloc of allocations) {
        if (remaining <= 0) break;
        const left = round3(Number(alloc.quantity) - Number(alloc.returnedQty));
        if (left <= 0) continue;
        const back = round3(Math.min(left, remaining));
        const restored = alloc.inventoryBatchId
          ? await tx.inventoryBatch.updateMany({
              where: { id: alloc.inventoryBatchId, companyId },
              data: { quantity: { increment: back } },
            })
          : { count: 0 };
        if (restored.count === 0) {
          // Складовият ред вече не съществува — връщаме като нов ред
          await tx.inventoryBatch.create({
            data: {
              batchNumber: `SI-RET-${issue.issueNumber}-${alloc.id.slice(-4)}`,
              quantity: back,
              initialQty: back,
              unitCost: alloc.unitCost,
              companyId,
              productId: item.productId,
              locationId: issue.locationId,
            },
          });
        }
        await tx.siteIssueAllocation.update({
          where: { id: alloc.id },
          data: { returnedQty: { increment: back } },
        });
        remaining = round3(remaining - back);
      }
    }
    await tx.siteIssueItem.update({
      where: { id: item.id },
      data: { returnedQty: { increment: qty } },
    });
  }

  // Частично връщане на неизползван материал от обекта в склада.
  async returnItems(companyId: string, id: string, dto: ReturnSiteIssueDto) {
    const issue = await this.findOne(companyId, id);
    if (issue.status !== 'ISSUED') {
      throw new BadRequestException(
        'Връщане е възможно само от изписан документ',
      );
    }

    // Сборуваме по ред — един и същ ред може да дойде два пъти в заявката
    const wanted = new Map<string, number>();
    for (const row of dto.items) {
      wanted.set(
        row.itemId,
        round3((wanted.get(row.itemId) || 0) + row.quantity),
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        for (const [itemId, qty] of wanted) {
          const item = issue.items.find((i) => i.id === itemId);
          if (!item) {
            throw new BadRequestException('Редът не е от това изписване');
          }
          // Вече продаденото не е на обекта като наш материал — не се връща
          const left = round3(
            Number(item.quantity) - Number(item.returnedQty) - soldQty(item),
          );
          if (qty > left) {
            throw new BadRequestException(
              `„${item.product.name}": може да се върне най-много ${left}`,
            );
          }
          await this.returnItemQty(tx, companyId, issue, item, qty);
        }
        return tx.siteIssue.findFirstOrThrow({
          where: { id, companyId },
          include: ISSUE_INCLUDE,
        });
      },
      { timeout: 20000 },
    );
  }

  // Анулиране: чернова → само статус; изписано → всичко невърнато се връща.
  async cancel(companyId: string, id: string) {
    const issue = await this.findOne(companyId, id);
    if (issue.status === 'CANCELLED') {
      throw new BadRequestException('Изписването вече е анулирано');
    }
    const inOrders = [
      ...new Set(
        issue.items.flatMap((item) =>
          (item.orderItems ?? []).map((oi) => oi.order.orderNumber),
        ),
      ),
    ];
    if (inOrders.length > 0) {
      throw new BadRequestException(
        `Материали от това изписване са включени в продажба ${inOrders.join(', ')}. Махнете ги от продажбата или я анулирайте първо.`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (issue.status === 'ISSUED') {
          for (const item of issue.items) {
            const left = round3(
              Number(item.quantity) - Number(item.returnedQty),
            );
            if (left > 0) {
              await this.returnItemQty(tx, companyId, issue, item, left);
            }
          }
        }
        return tx.siteIssue.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: ISSUE_INCLUDE,
        });
      },
      { timeout: 20000 },
    );
  }

  async remove(companyId: string, id: string) {
    const issue = await this.findOne(companyId, id);
    if (issue.status !== 'DRAFT') {
      throw new BadRequestException('Само чернова може да бъде изтрита');
    }
    await this.prisma.siteIssue.delete({ where: { id } });
    return { success: true };
  }

  // Хората от фирмата за полето „Изписал" (вкл. служители без достъп)
  async userOptions(companyId: string) {
    const members = await this.prisma.userCompany.findMany({
      where: { companyId, user: { isActive: true } },
      select: { user: { select: USER_SELECT } },
    });
    return members
      .map((m) => m.user)
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
          'bg',
        ),
      );
  }

  siteOptions(companyId: string) {
    return this.prisma.site.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // Материалите на обекта, сборувани по продукт (само изписани документи):
  // изписано, върнато, останало на обекта и стойността му по себестойност.
  async siteMaterials(companyId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('Обектът не е намерен');

    const items = await this.prisma.siteIssueItem.findMany({
      where: { siteIssue: { companyId, siteId, status: 'ISSUED' } },
      select: {
        quantity: true,
        returnedQty: true,
        unitCost: true,
        product: { select: { id: true, name: true, sku: true, unit: true } },
        orderItems: {
          where: { order: { status: { notIn: ['CANCELLED', 'RETURNED'] } } },
          select: { quantity: true },
        },
      },
    });

    const byProduct = new Map<
      string,
      {
        product: (typeof items)[number]['product'];
        issued: number;
        returned: number;
        sold: number;
        cost: number;
      }
    >();
    for (const item of items) {
      const row = byProduct.get(item.product.id) || {
        product: item.product,
        issued: 0,
        returned: 0,
        sold: 0,
        cost: 0,
      };
      row.issued += Number(item.quantity);
      row.returned += Number(item.returnedQty);
      row.sold += soldQty(item);
      row.cost += issueItemCost(item);
      byProduct.set(item.product.id, row);
    }

    const rows = [...byProduct.values()]
      .map((r) => ({
        product: r.product,
        issued: round3(r.issued),
        returned: round3(r.returned),
        onSite: round3(r.issued - r.returned),
        // Включено в продажби и остатъкът, който още не е влязъл в продажба
        sold: round3(r.sold),
        unsold: round3(r.issued - r.returned - r.sold),
        cost: round2(r.cost),
      }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'bg'));

    return {
      rows,
      totalCost: round2(rows.reduce((sum, r) => sum + r.cost, 0)),
    };
  }

  // Изписаното към обекта, което още не е в продажба — редовете, с които се
  // попълва нова продажба за обекта. excludeOrderId: при редакция собствените
  // редове на продажбата не се броят за „продадени".
  async unsoldForSite(
    companyId: string,
    siteId: string,
    excludeOrderId?: string,
  ) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('Обектът не е намерен');

    const items = await this.prisma.siteIssueItem.findMany({
      where: { siteIssue: { companyId, siteId, status: 'ISSUED' } },
      orderBy: [{ siteIssue: { issueDate: 'asc' } }, { id: 'asc' }],
      select: {
        id: true,
        quantity: true,
        returnedQty: true,
        unitCost: true,
        siteIssue: {
          select: {
            id: true,
            issueNumber: true,
            issueDate: true,
            location: { select: { id: true, name: true } },
          },
        },
        inventorySerial: { select: { id: true, serialNumber: true } },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            type: true,
            salePrice: true,
            vatRate: true,
          },
        },
        orderItems: {
          where: {
            order: { status: { notIn: ['CANCELLED', 'RETURNED'] } },
            ...(excludeOrderId && { orderId: { not: excludeOrderId } }),
          },
          select: { quantity: true },
        },
      },
    });

    return items
      .map(({ orderItems, quantity, returnedQty, ...item }) => ({
        ...item,
        unsold: round3(
          Number(quantity) - Number(returnedQty) - soldQty({ orderItems }),
        ),
      }))
      .filter((item) => item.unsold > 0);
  }
}
