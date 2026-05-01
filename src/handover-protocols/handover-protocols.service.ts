import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, HandoverProtocolStatus, OrderStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';
import {
  CreateHandoverProtocolDto,
  QueryHandoverProtocolsDto,
} from './dto';

@Injectable()
export class HandoverProtocolsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
      },
    },
    customer: true,
    createdBy: { select: { id: true, firstName: true, lastName: true } },
    items: {
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, type: true } },
        orderItem: true,
      },
    },
  };

  private async generateProtocolNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const db = tx || this.prisma;
    const prefix = 'PPP-';
    const last = await db.handoverProtocol.findFirst({
      where: { companyId, protocolNumber: { startsWith: prefix } },
      orderBy: { protocolNumber: 'desc' },
      select: { protocolNumber: true },
    });
    const lastNum = last
      ? parseInt(last.protocolNumber.slice(prefix.length), 10)
      : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}${next.toString().padStart(10, '0')}`;
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateHandoverProtocolDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(ErrorMessages.handoverProtocols.mustHaveItems);
    }
    if (!dto.receivedByName?.trim()) {
      throw new BadRequestException(ErrorMessages.handoverProtocols.receivedByNameRequired);
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true, type: true } },
            handoverProtocolItems: {
              where: { protocol: { status: { not: 'CANCELLED' } } },
              select: { quantity: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.handoverProtocols.orderNotFound);
    }

    const allowedStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        ErrorMessages.handoverProtocols.canOnlyCreateFromConfirmed,
      );
    }

    // Validate each item: belongs to order, qty doesn't exceed remainder, serials match if provided
    const orderItemsById = new Map(order.items.map((i) => [i.id, i]));
    const validatedItems: Array<{
      orderItemId: string;
      productId: string | null;
      description: string;
      quantity: number;
      serialNumbers: string[];
    }> = [];

    for (const dtoItem of dto.items) {
      const orderItem = orderItemsById.get(dtoItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(ErrorMessages.handoverProtocols.orderItemNotInOrder);
      }
      if (dtoItem.quantity <= 0) {
        throw new BadRequestException(ErrorMessages.handoverProtocols.quantityMustBePositive);
      }
      const ordered = Number(orderItem.quantity);
      const alreadyDelivered = orderItem.handoverProtocolItems.reduce(
        (sum, p) => sum + Number(p.quantity),
        0,
      );
      const remainder = ordered - alreadyDelivered;
      const EPSILON = 0.001;
      if (dtoItem.quantity > remainder + EPSILON) {
        throw new BadRequestException(
          ErrorMessages.handoverProtocols.quantityExceedsRemainder(
            orderItem.product?.name || 'артикул',
          ),
        );
      }

      const serials = (dtoItem.serialNumbers || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // For SERIAL products with serials provided, count must match qty
      if (
        orderItem.product?.type === 'SERIAL' &&
        serials.length > 0 &&
        Math.abs(serials.length - dtoItem.quantity) > EPSILON
      ) {
        throw new BadRequestException(
          ErrorMessages.handoverProtocols.serialCountMismatch(
            orderItem.product?.name || 'артикул',
          ),
        );
      }

      validatedItems.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        description: orderItem.product?.name || 'Артикул',
        quantity: dtoItem.quantity,
        serialNumbers: serials,
      });
    }

    if (validatedItems.length === 0) {
      throw new BadRequestException(ErrorMessages.handoverProtocols.mustHaveItems);
    }

    return this.prisma.$transaction(async (tx) => {
      const protocolNumber = await this.generateProtocolNumber(companyId, tx);
      return tx.handoverProtocol.create({
        data: {
          protocolNumber,
          protocolDate: dto.protocolDate ? new Date(dto.protocolDate) : new Date(),
          status: 'ISSUED',
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          receivedByName: dto.receivedByName.trim(),
          receivedByPosition: dto.receivedByPosition?.trim() || null,
          receivedByIdCardNumber: dto.receivedByIdCardNumber?.trim() || null,
          handoverLocation: dto.handoverLocation?.trim() || null,
          notes: dto.notes?.trim() || null,
          companyId,
          createdById: userId,
          items: {
            create: validatedItems.map((it) => ({
              orderItemId: it.orderItemId,
              productId: it.productId,
              description: it.description,
              quantity: it.quantity,
              serialNumbers: it.serialNumbers,
            })),
          },
        },
        include: this.include,
      });
    });
  }

  async findAll(companyId: string, query: QueryHandoverProtocolsDto) {
    const {
      search,
      status,
      orderId,
      customerId,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.HandoverProtocolWhereInput = {
      companyId,
      ...(status && { status }),
      ...(orderId && { orderId }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { protocolNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { receivedByName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.handoverProtocol.findMany({
        where,
        skip,
        take: limit,
        orderBy: { protocolDate: 'desc' },
        include: this.include,
      }),
      this.prisma.handoverProtocol.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByOrder(companyId: string, orderId: string) {
    return this.prisma.handoverProtocol.findMany({
      where: { companyId, orderId },
      orderBy: { protocolDate: 'desc' },
      include: this.include,
    });
  }

  async findOne(companyId: string, id: string) {
    const protocol = await this.prisma.handoverProtocol.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!protocol) {
      throw new NotFoundException(ErrorMessages.handoverProtocols.notFound);
    }
    return protocol;
  }

  async cancel(companyId: string, id: string) {
    const protocol = await this.findOne(companyId, id);
    if (protocol.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.handoverProtocols.alreadyCancelled);
    }
    return this.prisma.handoverProtocol.update({
      where: { id },
      data: { status: 'CANCELLED' as HandoverProtocolStatus },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.handoverProtocol.delete({ where: { id } });
  }
}
