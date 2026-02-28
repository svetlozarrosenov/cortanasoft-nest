import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBOMDto, UpdateBOMDto, QueryBOMDto } from './dto';
import { ErrorMessages } from '../common/constants/error-messages';
import { Prisma } from '@prisma/client';

@Injectable()
export class BOMService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateBOMDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(ErrorMessages.bom.mustHaveItems);
    }

    // Validate finished product exists
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.bom.productNotFound);
    }

    // Check for circular references
    const circularItem = dto.items.find((item) => item.productId === dto.productId);
    if (circularItem) {
      throw new BadRequestException(ErrorMessages.bom.circularReference);
    }

    // Validate all materials exist
    const materialIds = dto.items.map((item) => item.productId);
    const materials = await this.prisma.product.findMany({
      where: { id: { in: materialIds }, companyId },
    });
    if (materials.length !== new Set(materialIds).size) {
      throw new BadRequestException(ErrorMessages.bom.materialNotFound);
    }

    // Check unique name
    const existing = await this.prisma.billOfMaterial.findUnique({
      where: { companyId_name: { companyId, name: dto.name } },
    });
    if (existing) {
      throw new BadRequestException(ErrorMessages.bom.nameExists(dto.name));
    }

    return this.prisma.billOfMaterial.create({
      data: {
        name: dto.name,
        description: dto.description,
        productId: dto.productId,
        outputQuantity: dto.outputQuantity ?? 1,
        isActive: dto.isActive ?? true,
        companyId,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit ?? 'PIECE',
            notes: item.notes,
          })),
        },
      },
      include: {
        product: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true, productionOrders: true } },
      },
    });
  }

  async findAll(companyId: string, query: QueryBOMDto) {
    const {
      search,
      productId,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.BillOfMaterialWhereInput = {
      companyId,
      ...(productId && { productId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { product: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.billOfMaterial.findMany({
        where,
        include: {
          product: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true, productionOrders: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billOfMaterial.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id, companyId },
      include: {
        product: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true, productionOrders: true } },
      },
    });

    if (!bom) {
      throw new NotFoundException(ErrorMessages.bom.notFound);
    }

    return bom;
  }

  async update(companyId: string, id: string, dto: UpdateBOMDto) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id, companyId },
    });

    if (!bom) {
      throw new NotFoundException(ErrorMessages.bom.notFound);
    }

    // Check unique name if changed
    if (dto.name && dto.name !== bom.name) {
      const existing = await this.prisma.billOfMaterial.findUnique({
        where: { companyId_name: { companyId, name: dto.name } },
      });
      if (existing) {
        throw new BadRequestException(ErrorMessages.bom.nameExists(dto.name));
      }
    }

    // Check circular reference if productId or items changed
    const targetProductId = dto.productId ?? bom.productId;
    if (dto.items) {
      const circularItem = dto.items.find((item) => item.productId === targetProductId);
      if (circularItem) {
        throw new BadRequestException(ErrorMessages.bom.circularReference);
      }

      // Validate materials
      const materialIds = dto.items.map((item) => item.productId);
      const materials = await this.prisma.product.findMany({
        where: { id: { in: materialIds }, companyId },
      });
      if (materials.length !== new Set(materialIds).size) {
        throw new BadRequestException(ErrorMessages.bom.materialNotFound);
      }
    }

    // Use transaction for item replacement
    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.bOMItem.deleteMany({ where: { bomId: id } });
      }

      return tx.billOfMaterial.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.productId !== undefined && { productId: dto.productId }),
          ...(dto.outputQuantity !== undefined && { outputQuantity: dto.outputQuantity }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.items && {
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unit: item.unit ?? 'PIECE',
                notes: item.notes,
              })),
            },
          }),
        },
        include: {
          product: true,
          items: { include: { product: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true, productionOrders: true } },
        },
      });
    });
  }

  async remove(companyId: string, id: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id, companyId },
      include: { _count: { select: { productionOrders: true } } },
    });

    if (!bom) {
      throw new NotFoundException(ErrorMessages.bom.notFound);
    }

    if (bom._count.productionOrders > 0) {
      throw new BadRequestException(ErrorMessages.bom.cannotDeleteWithProductionOrders);
    }

    await this.prisma.billOfMaterial.delete({ where: { id } });

    return { message: 'Рецептата е изтрита успешно' };
  }
}
