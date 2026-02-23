import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateProductDto) {
    // Проверка за дублиран SKU в компанията
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        companyId_sku: {
          companyId,
          sku: dto.sku,
        },
      },
    });

    if (existingProduct) {
      throw new ConflictException(
        `Продукт с артикулен номер "${dto.sku}" вече съществува`,
      );
    }

    // Проверка дали категорията съществува и принадлежи на компанията
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: {
          id: dto.categoryId,
          companyId,
        },
      });

      if (!category) {
        throw new NotFoundException('Категорията не е намерена');
      }
    }

    // Ако не е зададена ДДС ставка или валута, определяме по данните на компанията
    if (dto.vatRate === undefined || !dto.purchaseCurrencyId || !dto.saleCurrencyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { vatNumber: true, currencyId: true },
      });
      if (dto.vatRate === undefined) {
        dto.vatRate = company?.vatNumber ? 20 : 0;
      }
      if (!dto.purchaseCurrencyId && company?.currencyId) {
        dto.purchaseCurrencyId = company.currencyId;
      }
      if (!dto.saleCurrencyId && company?.currencyId) {
        dto.saleCurrencyId = company.currencyId;
      }
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        companyId,
        createdById: userId,
      },
      include: {
        category: true,
        purchaseCurrency: true,
        saleCurrency: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, query: QueryProductsDto) {
    const {
      search,
      type,
      categoryId,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {
      companyId,
    };

    // Търсене по име, SKU или баркод
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          purchaseCurrency: true,
          saleCurrency: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        category: true,
        purchaseCurrency: true,
        saleCurrency: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Продуктът не е намерен');
    }

    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    // Проверка дали продуктът съществува
    await this.findOne(companyId, id);

    // Проверка за дублиран SKU ако се променя
    if (dto.sku) {
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          companyId,
          sku: dto.sku,
          NOT: { id },
        },
      });

      if (existingProduct) {
        throw new ConflictException(
          `Продукт с артикулен номер "${dto.sku}" вече съществува`,
        );
      }
    }

    // Проверка дали категорията съществува
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: {
          id: dto.categoryId,
          companyId,
        },
      });

      if (!category) {
        throw new NotFoundException('Категорията не е намерена');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        purchaseCurrency: true,
        saleCurrency: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(companyId: string, id: string) {
    // Проверка дали продуктът съществува
    await this.findOne(companyId, id);

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Категории
  async findAllCategories(companyId: string) {
    return this.prisma.productCategory.findMany({
      where: { companyId },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    companyId: string,
    data: { name: string; description?: string; parentId?: string },
  ) {
    // Проверка за дублирано име
    const existing = await this.prisma.productCategory.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Категория "${data.name}" вече съществува`);
    }

    return this.prisma.productCategory.create({
      data: {
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
        companyId,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async updateCategory(
    companyId: string,
    id: string,
    data: { name?: string; description?: string; parentId?: string },
  ) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Категорията не е намерена');
    }

    if (data.name && data.name !== category.name) {
      const existing = await this.prisma.productCategory.findFirst({
        where: {
          companyId,
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Категория "${data.name}" вече съществува`);
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.parentId !== undefined)
      updateData.parentId = data.parentId || null;

    return this.prisma.productCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async removeCategory(companyId: string, id: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Категорията не е намерена');
    }

    if (category._count.products > 0) {
      throw new ConflictException('Не може да изтриете категория с продукти');
    }

    if (category._count.children > 0) {
      throw new ConflictException(
        'Не може да изтриете категория с подкатегории',
      );
    }

    return this.prisma.productCategory.delete({
      where: { id },
    });
  }
}
