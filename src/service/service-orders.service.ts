import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import {
  Prisma,
  ServiceOrderStatus,
  ServicePartSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { ServiceNumberingService } from './service-numbering.service';
import { ServiceStockService } from './service-stock.service';
import {
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
  QueryServiceOrdersDto,
  ChangeServiceOrderStatusDto,
  AddServicePartDto,
  AddServiceLaborDto,
  AddServiceAttachmentDto,
  CreateLoanerDto,
  StartTimeLogDto,
  StopTimeLogDto,
} from './dto';

const ORDER_INCLUDE = {
  customer: true,
  asset: true,
  technician: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  receivedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  contract: true,
  invoice: true,
  parts: {
    include: { product: true, inventoryBatch: true, inventorySerial: true },
  },
  labor: true,
  loaners: { include: { product: true } },
  attachments: {
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  timeLogs: {
    orderBy: { startedAt: 'desc' },
    include: {
      technician: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const satisfies Prisma.ServiceOrderInclude;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const ALLOWED_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  NEW: ['DIAGNOSING', 'AWAITING_QUOTE', 'IN_REPAIR', 'CANCELED'],
  DIAGNOSING: ['AWAITING_QUOTE', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_REPAIR', 'CANCELED'],
  AWAITING_QUOTE: ['AWAITING_APPROVAL', 'CANCELED'],
  AWAITING_APPROVAL: ['IN_REPAIR', 'AWAITING_PARTS', 'CANCELED'],
  AWAITING_PARTS: ['IN_REPAIR', 'CANCELED'],
  IN_REPAIR: ['AWAITING_PARTS', 'READY', 'CANCELED'],
  READY: ['DELIVERED', 'IN_REPAIR'],
  DELIVERED: [],
  CANCELED: [],
};

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private numbering: ServiceNumberingService,
    private stock: ServiceStockService,
    private mail: MailService,
  ) {}

  // ==================== CRUD ====================

  async create(
    companyId: string,
    userId: string | undefined,
    dto: CreateServiceOrderDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.customers.notFound);
      }

      if (dto.assetId) {
        const asset = await tx.serviceAsset.findFirst({
          where: { id: dto.assetId, companyId },
        });
        if (!asset) throw new NotFoundException('Активът не е намерен');
      }

      if (dto.contractId) {
        const contract = await tx.serviceContract.findFirst({
          where: { id: dto.contractId, companyId },
        });
        if (!contract) throw new NotFoundException('Договорът не е намерен');
      }

      const orderNumber =
        dto.orderNumber || (await this.numbering.next('order', companyId, tx));

      const publicToken = dto.generatePublicToken
        ? randomBytes(24).toString('hex')
        : null;

      const order = await tx.serviceOrder.create({
        data: {
          companyId,
          orderNumber,
          type: dto.type || 'PAID',
          priority: dto.priority || 'NORMAL',
          serviceLocation: dto.serviceLocation || 'IN_HOUSE',
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
          promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : null,
          customerComplaint: dto.customerComplaint,
          accessories: dto.accessories,
          cosmeticState: dto.cosmeticState,
          declaredFault: dto.declaredFault,
          internalNotes: dto.internalNotes,
          estimatedCost: dto.estimatedCost,
          notifyCustomer: dto.notifyCustomer ?? true,
          publicToken,
          customerId: dto.customerId,
          assetId: dto.assetId,
          technicianId: dto.technicianId,
          receivedById: userId,
          contractId: dto.contractId,
        },
        include: ORDER_INCLUDE,
      });

      await tx.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: order.id,
          fromStatus: null,
          toStatus: 'NEW',
          changedById: userId,
          note: 'Заявката е приета',
        },
      });

      return order;
    });
  }

  async findAll(companyId: string, query: QueryServiceOrdersDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.ServiceOrderWhereInput = { companyId };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.technicianId) where.technicianId = query.technicianId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.assetId) where.assetId = query.assetId;
    if (query.dateFrom || query.dateTo) {
      where.receivedAt = {};
      if (query.dateFrom) where.receivedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.receivedAt.lte = new Date(query.dateTo);
    }
    if (query.search) {
      const s = query.search;
      where.OR = [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { customerComplaint: { contains: s, mode: 'insensitive' } },
        { customer: { companyName: { contains: s, mode: 'insensitive' } } },
        { customer: { lastName: { contains: s, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: s, mode: 'insensitive' } } },
        { asset: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        include: {
          customer: true,
          asset: true,
          technician: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { parts: true, labor: true, attachments: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Сервизната заявка не е намерена');
    }
    return order;
  }

  async update(companyId: string, id: string, dto: UpdateServiceOrderDto) {
    const existing = await this.findOne(companyId, id);

    if (existing.status === 'DELIVERED' || existing.status === 'CANCELED') {
      throw new BadRequestException(
        'Не може да редактирате приключена заявка',
      );
    }

    if (dto.assetId) {
      const asset = await this.prisma.serviceAsset.findFirst({
        where: { id: dto.assetId, companyId },
      });
      if (!asset) throw new NotFoundException('Активът не е намерен');
    }

    if (dto.contractId) {
      const contract = await this.prisma.serviceContract.findFirst({
        where: { id: dto.contractId, companyId },
      });
      if (!contract) throw new NotFoundException('Договорът не е намерен');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          ...dto,
          promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : undefined,
        },
        include: ORDER_INCLUDE,
      });

      await this.recomputeTotals(updated.id, tx);
      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: updated.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    if (order.status !== 'NEW' && order.status !== 'CANCELED') {
      throw new BadRequestException(
        'Може да изтриете само нови или отказани заявки',
      );
    }
    return this.prisma.serviceOrder.delete({ where: { id } });
  }

  // ==================== Status flow ====================

  async changeStatus(
    companyId: string,
    id: string,
    userId: string | undefined,
    dto: ChangeServiceOrderStatusDto,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status === dto.status) return order;

    // State machine restriction lifted at user request — workshop owners want
    // full flexibility to override status (re-open a cancelled order, move back
    // from READY to IN_REPAIR, etc.). The status_history audit log + per-change
    // note preserve intent if anything goes wrong. ALLOWED_TRANSITIONS is kept
    // in code as documentation of the "happy-path" flow.

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.ServiceOrderUpdateInput = { status: dto.status };

      const now = new Date();
      if (dto.status === 'DIAGNOSING' && !order.diagnosedAt) {
        data.diagnosedAt = now;
      }
      if (dto.status === 'IN_REPAIR' && !order.approvedAt) {
        data.approvedAt = now;
      }
      if (dto.status === 'READY' && !order.completedAt) {
        data.completedAt = now;
      }
      if (dto.status === 'DELIVERED') {
        // Only set deliveredAt and deduct stock the FIRST time we enter DELIVERED —
        // otherwise re-DELIVERING (e.g. after a bounce back to IN_REPAIR) would
        // double-deduct BATCH inventory.
        if (!order.deliveredAt) {
          data.deliveredAt = now;
          await this.stock.deductPartsForOrder(tx, id, companyId);
        }
      }

      const updated = await tx.serviceOrder.update({
        where: { id },
        data,
      });

      await tx.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          note: dto.note,
          changedById: userId,
        },
      });

      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: updated.id },
        include: ORDER_INCLUDE,
      });
    }).then(async (result) => {
      // Клиентска комуникация (best-effort, извън транзакцията):
      // при READY клиентът получава „готово за получаване" с tracking линка.
      if (dto.status === 'READY' && result.notifyCustomer) {
        await this.emailCustomerStatus(result as any).catch((err) =>
          this.logger.error('Failed to email customer on READY', err),
        );
      }
      return result;
    });
  }

  /** Имейл до клиента при готов ремонт (ако има имейл + notifyCustomer). */
  private async emailCustomerStatus(order: {
    id: string;
    orderNumber: string;
    publicToken: string | null;
    customer: { email: string | null; firstName: string | null } | null;
    asset: { name: string } | null;
  }) {
    const email = order.customer?.email;
    if (!email) return;
    const link = order.publicToken
      ? `${process.env.FRONTEND_URL || 'https://cortanasoft.com'}/service-status/${order.publicToken}`
      : null;
    await this.mail.send({
      to: email,
      subject: `Ремонтът по заявка ${order.orderNumber} е готов`,
      html:
        `<p>Здравейте${order.customer?.firstName ? `, ${order.customer.firstName}` : ''},</p>` +
        `<p>${order.asset?.name ? `Вашето устройство „${order.asset.name}"` : 'Вашата сервизна заявка'} по заявка <b>${order.orderNumber}</b> е готово за получаване.</p>` +
        (link ? `<p>Статус на заявката: <a href="${link}">${link}</a></p>` : '') +
        `<p>(изпратено автоматично от CortanaSoft)</p>`,
    });
  }

  /**
   * Изпраща tracking линка на клиента по имейл. Генерира публичен токен,
   * ако заявката е създадена без такъв.
   */
  async sendTrackingLink(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    const email = (order as any).customer?.email;
    if (!email) {
      throw new BadRequestException('Клиентът няма въведен имейл');
    }

    let token = order.publicToken;
    if (!token) {
      token = randomBytes(24).toString('hex');
      await this.prisma.serviceOrder.update({
        where: { id },
        data: { publicToken: token },
      });
    }

    const link = `${process.env.FRONTEND_URL || 'https://cortanasoft.com'}/service-status/${token}`;
    await this.mail.send({
      to: email,
      subject: `Проследяване на сервизна заявка ${order.orderNumber}`,
      html:
        `<p>Здравейте,</p><p>Можете да следите статуса на вашата сервизна заявка <b>${order.orderNumber}</b> на адрес:</p>` +
        `<p><a href="${link}">${link}</a></p><p>(изпратено автоматично от CortanaSoft)</p>`,
    });

    return { success: true, publicToken: token, sentTo: email };
  }

  private assertEditable(order: { status: ServiceOrderStatus }) {
    if (order.status === 'DELIVERED' || order.status === 'CANCELED') {
      throw new BadRequestException(
        'Не може да правите промени по приключена заявка',
      );
    }
  }

  // ==================== Parts ====================

  async addPart(companyId: string, id: string, dto: AddServicePartDto) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.products.notFound);
    }

    return this.prisma.$transaction(async (tx) => {
      const totalPrice = round2(dto.quantity * dto.unitPrice);
      await tx.serviceOrderPart.create({
        data: {
          serviceOrderId: order.id,
          productId: dto.productId,
          source: dto.source || ServicePartSource.STOCK,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          totalPrice,
          isWarranty: dto.isWarranty ?? false,
          inventoryBatchId: dto.inventoryBatchId,
          inventorySerialId: dto.inventorySerialId,
        },
      });
      await this.recomputeTotals(order.id, tx);
      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  async removePart(companyId: string, id: string, partId: string) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);
    const part = await this.prisma.serviceOrderPart.findUnique({
      where: { id: partId },
    });
    if (!part || part.serviceOrderId !== order.id) {
      throw new NotFoundException('Резервната част не е намерена');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceOrderPart.delete({ where: { id: partId } });
      await this.recomputeTotals(order.id, tx);
      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  // ==================== Labor ====================

  async addLabor(companyId: string, id: string, dto: AddServiceLaborDto) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);

    return this.prisma.$transaction(async (tx) => {
      const totalPrice = round2(dto.hours * dto.hourlyRate);
      await tx.serviceOrderLabor.create({
        data: {
          serviceOrderId: order.id,
          description: dto.description,
          hours: dto.hours,
          hourlyRate: dto.hourlyRate,
          totalPrice,
          isWarranty: dto.isWarranty ?? false,
        },
      });
      await this.recomputeTotals(order.id, tx);
      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  async removeLabor(companyId: string, id: string, laborId: string) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);
    const labor = await this.prisma.serviceOrderLabor.findUnique({
      where: { id: laborId },
    });
    if (!labor || labor.serviceOrderId !== order.id) {
      throw new NotFoundException('Записът за труд не е намерен');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.serviceOrderLabor.delete({ where: { id: laborId } });
      await this.recomputeTotals(order.id, tx);
      return tx.serviceOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: ORDER_INCLUDE,
      });
    });
  }

  // ==================== Time logs ====================

  async startTimeLog(
    companyId: string,
    id: string,
    technicianId: string,
    dto: StartTimeLogDto,
  ) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);

    const open = await this.prisma.serviceOrderTimeLog.findFirst({
      where: { serviceOrderId: order.id, technicianId, endedAt: null },
    });
    if (open) {
      throw new BadRequestException(
        'Имате стартиран таймер по тази заявка. Спрете го преди да започнете нов.',
      );
    }

    return this.prisma.serviceOrderTimeLog.create({
      data: {
        serviceOrderId: order.id,
        technicianId,
        startedAt: new Date(),
        notes: dto.notes,
      },
    });
  }

  async stopTimeLog(
    companyId: string,
    id: string,
    technicianId: string,
    dto: StopTimeLogDto,
  ) {
    const order = await this.findOne(companyId, id);

    const open = await this.prisma.serviceOrderTimeLog.findFirst({
      where: { serviceOrderId: order.id, technicianId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!open) {
      throw new BadRequestException('Няма стартиран таймер по тази заявка');
    }

    const endedAt = new Date();
    const minutes = Math.max(
      0,
      Math.round((endedAt.getTime() - open.startedAt.getTime()) / 60000),
    );

    return this.prisma.serviceOrderTimeLog.update({
      where: { id: open.id },
      data: {
        endedAt,
        minutes,
        notes: dto.notes ?? open.notes,
      },
    });
  }

  // ==================== Attachments ====================

  async addAttachment(
    companyId: string,
    id: string,
    userId: string | undefined,
    dto: AddServiceAttachmentDto,
  ) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);
    return this.prisma.serviceOrderAttachment.create({
      data: {
        serviceOrderId: order.id,
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        kind: dto.kind,
        uploadedById: userId,
      },
    });
  }

  async removeAttachment(companyId: string, id: string, attachmentId: string) {
    const order = await this.findOne(companyId, id);
    const att = await this.prisma.serviceOrderAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!att || att.serviceOrderId !== order.id) {
      throw new NotFoundException('Прикаченият файл не е намерен');
    }
    return this.prisma.serviceOrderAttachment.delete({
      where: { id: attachmentId },
    });
  }

  // ==================== Loaners ====================

  async addLoaner(companyId: string, id: string, dto: CreateLoanerDto) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);
    return this.prisma.serviceLoaner.create({
      data: {
        serviceOrderId: order.id,
        productId: dto.productId,
        serialNumber: dto.serialNumber,
        description: dto.description,
      },
      include: { product: true },
    });
  }

  async returnLoaner(companyId: string, id: string, loanerId: string) {
    const order = await this.findOne(companyId, id);
    const loaner = await this.prisma.serviceLoaner.findUnique({
      where: { id: loanerId },
    });
    if (!loaner || loaner.serviceOrderId !== order.id) {
      throw new NotFoundException('Заетото устройство не е намерено');
    }
    return this.prisma.serviceLoaner.update({
      where: { id: loanerId },
      data: { status: 'RETURNED', returnedAt: new Date() },
      include: { product: true },
    });
  }

  // ==================== Public tracking ====================

  async findByPublicToken(token: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { publicToken: token },
      select: {
        orderNumber: true,
        status: true,
        receivedAt: true,
        promisedAt: true,
        completedAt: true,
        deliveredAt: true,
        estimatedCost: true,
        isApprovedByCustomer: true,
        asset: { select: { name: true, brand: true, model: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          select: {
            toStatus: true,
            createdAt: true,
            note: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Заявката не е намерена');
    }
    // Клиентът може да одобри само докато чакаме оферта/одобрение
    const canApprove =
      !order.isApprovedByCustomer &&
      (order.status === 'AWAITING_QUOTE' || order.status === 'AWAITING_APPROVAL');
    return { ...order, canApprove };
  }

  /**
   * Одобрение на ремонта от клиента през публичната tracking страница.
   * Токенът е тайната (24 байта) — не изискваме друга автентикация.
   * При одобрение заявката минава в IN_REPAIR със запис в историята.
   */
  async approveByPublicToken(token: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { publicToken: token },
      select: { id: true, status: true, isApprovedByCustomer: true },
    });
    if (!order) {
      throw new NotFoundException('Заявката не е намерена');
    }
    if (order.isApprovedByCustomer) {
      throw new BadRequestException('Ремонтът вече е одобрен');
    }
    if (order.status !== 'AWAITING_QUOTE' && order.status !== 'AWAITING_APPROVAL') {
      throw new BadRequestException(
        'Заявката не очаква одобрение в момента',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          isApprovedByCustomer: true,
          approvalChannel: 'portal',
          approvedAt: new Date(),
          status: 'IN_REPAIR',
        },
      });
      await tx.serviceOrderStatusHistory.create({
        data: {
          serviceOrderId: order.id,
          fromStatus: order.status,
          toStatus: 'IN_REPAIR',
          note: 'Одобрено от клиента през публичната страница',
        },
      });
    });

    return { success: true };
  }

  // ==================== Helpers ====================

  private async recomputeTotals(
    serviceOrderId: string,
    tx: Prisma.TransactionClient,
  ) {
    const [parts, labor, current] = await Promise.all([
      tx.serviceOrderPart.findMany({
        where: { serviceOrderId },
        select: { totalPrice: true },
      }),
      tx.serviceOrderLabor.findMany({
        where: { serviceOrderId },
        select: { totalPrice: true },
      }),
      tx.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        select: { discountAmount: true },
      }),
    ]);

    const partsTotal = round2(
      parts.reduce((acc, p) => acc + Number(p.totalPrice), 0),
    );
    const laborTotal = round2(
      labor.reduce((acc, l) => acc + Number(l.totalPrice), 0),
    );
    const discount = current ? Number(current.discountAmount) : 0;
    const totalAmount = round2(Math.max(0, partsTotal + laborTotal - discount));

    await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { partsTotal, laborTotal, totalAmount },
    });
  }
}
