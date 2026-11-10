import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ServiceOrderStatus, ServicePartSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { ServiceNumberingService } from './service-numbering.service';
import { ServiceStockService } from './service-stock.service';
import { UploadsService } from '../uploads/uploads.service';
import { decodeUploadedFileName } from '../common/utils/upload-filename';
import { assertOwned } from '../common/utils/assert-owned';
import {
  CreateServiceOrderDto,
  UpdateServiceOrderDto,
  QueryServiceOrdersDto,
  ChangeServiceOrderStatusDto,
  AddServicePartDto,
} from './dto';

export const SERVICE_ATTACHMENT_KINDS = [
  'photo_in',
  'photo_out',
  'invoice_supplier',
  'other',
] as const;
export type ServiceAttachmentKind = (typeof SERVICE_ATTACHMENT_KINDS)[number];

const ORDER_INCLUDE = {
  customer: true,
  asset: true,
  technician: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  receivedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  parts: {
    include: { product: true, inventoryBatch: true, inventorySerial: true },
  },
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
} as const satisfies Prisma.ServiceOrderInclude;

// Естественият път на заявката (само документация — всеки статус може да
// се смени към всеки, историята пази промените):
// NEW → DIAGNOSING → AWAITING_PARTS → IN_REPAIR → READY → DELIVERED

@Injectable()
export class ServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: ServiceNumberingService,
    private stock: ServiceStockService,
    private uploads: UploadsService,
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
        if (!asset) throw new NotFoundException('Артикулът не е намерен');
      }

      await this.assertTechnician(companyId, dto.technicianId, tx);

      const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
      const warrantyEndAt = await this.resolveWarrantyEndAt(
        tx,
        companyId,
        dto.assetId,
      );

      const orderNumber =
        dto.orderNumber || (await this.numbering.next('order', companyId, tx));

      const order = await tx.serviceOrder.create({
        data: {
          companyId,
          orderNumber,
          priority: dto.priority || 'NORMAL',
          receivedAt,
          promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : null,
          warrantyEndAt,
          customerComplaint: dto.customerComplaint,
          accessories: dto.accessories,
          cosmeticState: dto.cosmeticState,
          declaredFault: dto.declaredFault,
          internalNotes: dto.internalNotes,
          customerId: dto.customerId,
          assetId: dto.assetId,
          technicianId: dto.technicianId,
          receivedById: userId,
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
          // Иконите за приемен/предавателен протокол в реда
          acceptanceProtocols: {
            where: { status: { not: 'CANCELLED' } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              documentNumber: true,
              status: true,
              serviceKind: true,
            },
          },
          ascertainmentProtocols: {
            where: { status: { not: 'CANCELLED' } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, documentNumber: true, status: true },
          },
          _count: { select: { parts: true, attachments: true } },
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
      throw new BadRequestException('Не може да редактирате приключена заявка');
    }

    if (dto.assetId) {
      const asset = await this.prisma.serviceAsset.findFirst({
        where: { id: dto.assetId, companyId },
      });
      if (!asset) throw new NotFoundException('Артикулът не е намерен');
    }

    await this.assertTechnician(companyId, dto.technicianId);

    // Смяна на артикула → снимката на гаранцията се прави наново
    const warrantyEndAt =
      dto.assetId && dto.assetId !== existing.assetId
        ? await this.resolveWarrantyEndAt(this.prisma, companyId, dto.assetId)
        : undefined;

    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        ...dto,
        promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : undefined,
        warrantyEndAt,
      },
      include: ORDER_INCLUDE,
    });
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

    // Без ограничения в преходите (по желание на потребителя): собственикът
    // на сервиза може да върне назад или да отвори отказана заявка; историята
    // на статусите пази кой, кога и защо.

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.ServiceOrderUpdateInput = { status: dto.status };

      const now = new Date();
      if (dto.status === 'DIAGNOSING' && !order.diagnosedAt) {
        data.diagnosedAt = now;
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
    });
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
    // Партидата и серийният номер трябва да са на фирмата и на този продукт
    await assertOwned(
      this.prisma,
      'inventoryBatch',
      dto.inventoryBatchId,
      companyId,
      { productId: dto.productId },
    );
    if (dto.inventorySerialId) {
      const serial = await this.prisma.inventorySerial.findFirst({
        where: {
          id: dto.inventorySerialId,
          companyId,
          productId: dto.productId,
        },
        select: { id: true },
      });
      if (!serial) {
        throw new NotFoundException('Серийният номер не е намерен');
      }
    }

    await this.prisma.serviceOrderPart.create({
      data: {
        serviceOrderId: order.id,
        productId: dto.productId,
        source: dto.source || ServicePartSource.STOCK,
        quantity: dto.quantity,
        inventoryBatchId: dto.inventoryBatchId,
        inventorySerialId: dto.inventorySerialId,
      },
    });
    return this.findOne(companyId, id);
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
    await this.prisma.serviceOrderPart.delete({ where: { id: partId } });
    return this.findOne(companyId, id);
  }

  // ==================== Attachments ====================

  // Файлът отива в R2 (частен bucket); клиентът го отваря през
  // GET :id/attachments/:attachmentId/file
  async addAttachment(
    companyId: string,
    id: string,
    userId: string | undefined,
    file: Express.Multer.File,
    kind: ServiceAttachmentKind | undefined,
  ) {
    const order = await this.findOne(companyId, id);
    this.assertEditable(order);
    const { key } = await this.uploads.uploadFile(
      companyId,
      'service-orders',
      file,
    );
    return this.prisma.serviceOrderAttachment.create({
      data: {
        serviceOrderId: order.id,
        fileKey: key,
        fileSize: file.size,
        fileName: decodeUploadedFileName(file.originalname),
        mimeType: file.mimetype,
        kind: kind ?? 'other',
        uploadedById: userId,
      },
    });
  }

  async getAttachmentStream(
    companyId: string,
    id: string,
    attachmentId: string,
  ) {
    const att = await this.prisma.serviceOrderAttachment.findFirst({
      where: {
        id: attachmentId,
        serviceOrderId: id,
        serviceOrder: { companyId },
      },
    });
    if (!att || !att.fileKey) {
      throw new NotFoundException('Прикаченият файл не е намерен');
    }
    const { stream, contentType } = await this.uploads.getFile(att.fileKey);
    return { stream, contentType, fileName: att.fileName };
  }

  async removeAttachment(companyId: string, id: string, attachmentId: string) {
    const order = await this.findOne(companyId, id);
    const att = await this.prisma.serviceOrderAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!att || att.serviceOrderId !== order.id) {
      throw new NotFoundException('Прикаченият файл не е намерен');
    }
    const deleted = await this.prisma.serviceOrderAttachment.delete({
      where: { id: attachmentId },
    });
    if (att.fileKey) await this.uploads.deleteFile(att.fileKey);
    return deleted;
  }

  // ==================== Helpers ====================

  /**
   * До кога е валидна гаранцията на артикула: първо закачената за него,
   * иначе най-дългата активна гаранция по сериен номер + продукт (както при
   * завеждане от продажба). Статусът EXPIRED/VOIDED не се брои.
   */
  private async resolveWarrantyEndAt(
    tx: Prisma.TransactionClient,
    companyId: string,
    assetId: string | null | undefined,
  ): Promise<Date | null> {
    if (!assetId) return null;
    const asset = await tx.serviceAsset.findFirst({
      where: { id: assetId, companyId },
      include: { warranty: { select: { status: true, endDate: true } } },
    });
    if (!asset) return null;
    if (asset.warranty?.status === 'ACTIVE') return asset.warranty.endDate;
    if (!asset.serialNumber || !asset.productId) return null;
    const bySerial = await tx.issuedWarranty.findFirst({
      where: {
        companyId,
        serialNumber: asset.serialNumber,
        productId: asset.productId,
        status: 'ACTIVE',
      },
      orderBy: { endDate: 'desc' },
      select: { endDate: true },
    });
    return bySerial?.endDate ?? null;
  }

  /**
   * Техникът трябва да е потребител на същата фирма (служител с или без
   * достъп). Без проверката API-то приема произволен userId от друг наемател.
   */
  private async assertTechnician(
    companyId: string,
    technicianId: string | null | undefined,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (!technicianId) return;
    const membership = await tx.userCompany.findFirst({
      where: { companyId, userId: technicianId },
      select: { id: true },
    });
    if (!membership) {
      throw new NotFoundException(ErrorMessages.employees.notFound);
    }
  }
}
