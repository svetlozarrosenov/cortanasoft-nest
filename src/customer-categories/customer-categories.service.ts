import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerCategoryDto,
  QueryCustomerCategoriesDto,
  UpdateCustomerCategoryDto,
} from './dto';

// Категории клиенти — по образеца на категориите на продуктите, без йерархия.
@Injectable()
export class CustomerCategoriesService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    _count: { select: { customers: true } },
  };

  findAll(companyId: string, query: QueryCustomerCategoriesDto = {}) {
    return this.prisma.customerCategory.findMany({
      where: {
        companyId,
        ...(query.search && {
          name: { contains: query.search, mode: 'insensitive' },
        }),
      },
      include: this.include,
      orderBy: { name: 'asc' },
      ...(query.limit && { take: query.limit }),
    });
  }

  async create(companyId: string, dto: CreateCustomerCategoryDto) {
    const name = dto.name.trim();
    await this.assertUniqueName(companyId, name);
    return this.prisma.customerCategory.create({
      data: { name, description: dto.description?.trim() || null, companyId },
      include: this.include,
    });
  }

  async update(companyId: string, id: string, dto: UpdateCustomerCategoryDto) {
    const category = await this.findOne(companyId, id);
    const name = dto.name?.trim();
    if (name && name !== category.name) {
      await this.assertUniqueName(companyId, name, id);
    }
    return this.prisma.customerCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
      },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    const category = await this.findOne(companyId, id);
    if (category._count.customers > 0) {
      throw new ConflictException(
        `Категорията има ${category._count.customers} клиенти. Първо ги махнете от нея.`,
      );
    }
    await this.prisma.customerCategory.delete({ where: { id } });
    return { success: true };
  }

  /** Проверява, че всички подадени категории са на тази фирма (cross-tenant guard). */
  async assertAllBelongToCompany(companyId: string, ids: string[]) {
    if (ids.length === 0) return;
    const count = await this.prisma.customerCategory.count({
      where: { id: { in: ids }, companyId },
    });
    if (count !== new Set(ids).size) {
      throw new NotFoundException('Някоя от категориите не е намерена');
    }
  }

  private async findOne(companyId: string, id: string) {
    const category = await this.prisma.customerCategory.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!category) throw new NotFoundException('Категорията не е намерена');
    return category;
  }

  private async assertUniqueName(
    companyId: string,
    name: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.customerCategory.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId && { NOT: { id: exceptId } }),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Категория „${name}" вече съществува`);
    }
  }
}
