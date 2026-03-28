import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarrantyTemplateDto,
  UpdateWarrantyTemplateDto,
  QueryWarrantyTemplatesDto,
  QueryIssuedWarrantiesDto,
  UpdateIssuedWarrantyDto,
} from './dto';
import { Prisma } from '@prisma/client';

const USER_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} as const;

@Injectable()
export class WarrantiesService {
  constructor(private prisma: PrismaService) {}

  // ==================== Warranty Templates ====================

  async createTemplate(companyId: string, userId: string, dto: CreateWarrantyTemplateDto) {
    return this.prisma.warrantyTemplate.create({
      data: {
        name: dto.name,
        type: dto.type || 'STANDARD',
        duration: dto.duration,
        durationUnit: dto.durationUnit || 'MONTHS',
        description: dto.description,
        isActive: dto.isActive ?? true,
        companyId,
        createdById: userId,
      },
      include: {
        createdBy: USER_SELECT,
      },
    });
  }

  async findAllTemplates(companyId: string, query: QueryWarrantyTemplatesDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WarrantyTemplateWhereInput = { companyId };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const orderBy: Prisma.WarrantyTemplateOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.warrantyTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdBy: USER_SELECT,
          _count: { select: { products: true, issuedWarranties: true } },
        },
      }),
      this.prisma.warrantyTemplate.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneTemplate(companyId: string, id: string) {
    const template = await this.prisma.warrantyTemplate.findFirst({
      where: { id, companyId },
      include: {
        createdBy: USER_SELECT,
        _count: { select: { products: true, issuedWarranties: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Гаранционният шаблон не е намерен');
    }

    return template;
  }

  async updateTemplate(companyId: string, id: string, dto: UpdateWarrantyTemplateDto) {
    await this.findOneTemplate(companyId, id);

    return this.prisma.warrantyTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.durationUnit !== undefined && { durationUnit: dto.durationUnit }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        createdBy: USER_SELECT,
      },
    });
  }

  async removeTemplate(companyId: string, id: string) {
    const template = await this.findOneTemplate(companyId, id);

    if (template._count.issuedWarranties > 0) {
      throw new BadRequestException(
        'Не може да изтриете шаблон с издадени гаранции. Деактивирайте го вместо това.',
      );
    }

    return this.prisma.warrantyTemplate.delete({ where: { id } });
  }

  // ==================== Issued Warranties ====================

  async findAllIssued(companyId: string, query: QueryIssuedWarrantiesDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.IssuedWarrantyWhereInput = { companyId };

    if (query.search) {
      where.OR = [
        { warrantyNumber: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.warrantyTemplateId) {
      where.warrantyTemplateId = query.warrantyTemplateId;
    }

    if (query.dateFrom || query.dateTo) {
      where.startDate = {};
      if (query.dateFrom) {
        where.startDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.startDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
      }
    }

    const orderBy: Prisma.IssuedWarrantyOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.issuedWarranty.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          warrantyTemplate: true,
          product: { select: { id: true, name: true, sku: true } },
          customer: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
              type: true,
            },
          },
          order: { select: { id: true, orderNumber: true, orderDate: true } },
        },
      }),
      this.prisma.issuedWarranty.count({ where }),
    ]);

    // Lazily update expired warranties
    const now = new Date();
    const expiredIds = data
      .filter((w) => w.status === 'ACTIVE' && new Date(w.endDate) < now)
      .map((w) => w.id);

    if (expiredIds.length > 0) {
      await this.prisma.issuedWarranty.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      });
      // Update in-memory data
      data.forEach((w) => {
        if (expiredIds.includes(w.id)) {
          (w as any).status = 'EXPIRED';
        }
      });
    }

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneIssued(companyId: string, id: string) {
    const warranty = await this.prisma.issuedWarranty.findFirst({
      where: { id, companyId },
      include: {
        warrantyTemplate: true,
        product: { select: { id: true, name: true, sku: true } },
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        order: { select: { id: true, orderNumber: true, orderDate: true } },
      },
    });

    if (!warranty) {
      throw new NotFoundException('Издадената гаранция не е намерена');
    }

    // Lazy expiration check
    if (warranty.status === 'ACTIVE' && new Date(warranty.endDate) < new Date()) {
      await this.prisma.issuedWarranty.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      (warranty as any).status = 'EXPIRED';
    }

    return warranty;
  }

  async updateIssued(companyId: string, id: string, dto: UpdateIssuedWarrantyDto) {
    await this.findOneIssued(companyId, id);

    return this.prisma.issuedWarranty.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        warrantyTemplate: true,
        product: { select: { id: true, name: true, sku: true } },
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            type: true,
          },
        },
        order: { select: { id: true, orderNumber: true, orderDate: true } },
      },
    });
  }

  // ==================== Auto-create for Orders ====================

  async createWarrantiesForOrder(
    companyId: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { warrantyTemplate: true },
            },
            inventorySerial: true,
          },
        },
      },
    });

    if (!order) return;

    const warrantiesToCreate: Prisma.IssuedWarrantyCreateManyInput[] = [];

    for (const item of order.items) {
      const template = item.product?.warrantyTemplate;
      if (!template || !template.isActive) continue;

      const startDate = order.orderDate;
      const endDate = this.calculateEndDate(startDate, template.duration, template.durationUnit);
      const warrantyNumber = await this.generateWarrantyNumber(companyId, client);

      warrantiesToCreate.push({
        warrantyNumber,
        startDate,
        endDate,
        status: 'ACTIVE',
        serialNumber: item.inventorySerial?.serialNumber || null,
        quantity: Number(item.quantity),
        companyId,
        warrantyTemplateId: template.id,
        orderId,
        productId: item.product.id,
        customerId: order.customerId,
      });
    }

    if (warrantiesToCreate.length > 0) {
      await client.issuedWarranty.createMany({ data: warrantiesToCreate });
    }
  }

  private calculateEndDate(
    startDate: Date,
    duration: number,
    unit: string,
  ): Date {
    const end = new Date(startDate);
    switch (unit) {
      case 'DAYS':
        end.setDate(end.getDate() + duration);
        break;
      case 'MONTHS':
        end.setMonth(end.getMonth() + duration);
        break;
      case 'YEARS':
        end.setFullYear(end.getFullYear() + duration);
        break;
    }
    return end;
  }

  private async generateWarrantyNumber(
    companyId: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WAR-${year}-`;

    const last = await client.issuedWarranty.findFirst({
      where: {
        companyId,
        warrantyNumber: { startsWith: prefix },
      },
      orderBy: { warrantyNumber: 'desc' },
    });

    let nextNumber = 1;
    if (last) {
      const lastNum = parseInt(last.warrantyNumber.split('-').pop() || '0');
      nextNumber = lastNum + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
