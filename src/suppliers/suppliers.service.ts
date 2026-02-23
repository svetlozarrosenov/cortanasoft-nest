import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySuppliersDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateSupplierDto) {
    // Проверка за дублиран ЕИК в компанията
    if (dto.eik) {
      const existingSupplier = await this.prisma.supplier.findUnique({
        where: {
          companyId_eik: {
            companyId,
            eik: dto.eik,
          },
        },
      });

      if (existingSupplier) {
        throw new ConflictException(
          `Доставчик с ЕИК "${dto.eik}" вече съществува`,
        );
      }
    }

    return this.prisma.supplier.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async findAll(companyId: string, query: QuerySuppliersDto) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.SupplierWhereInput = {
      companyId,
    };

    // Търсене по име, ЕИК, контактно лице или имейл
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { eik: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Доставчикът не е намерен');
    }

    return supplier;
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    // Проверка дали доставчикът съществува
    await this.findOne(companyId, id);

    // Проверка за дублиран ЕИК ако се променя
    if (dto.eik) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: {
          companyId,
          eik: dto.eik,
          NOT: { id },
        },
      });

      if (existingSupplier) {
        throw new ConflictException(
          `Доставчик с ЕИК "${dto.eik}" вече съществува`,
        );
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    // Проверка дали доставчикът съществува
    await this.findOne(companyId, id);

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
