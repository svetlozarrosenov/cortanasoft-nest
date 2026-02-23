import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { Prisma, CustomerType } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateCustomerDto) {
    // Validate based on type
    const type = dto.type || CustomerType.INDIVIDUAL;

    if (type === CustomerType.COMPANY && !dto.companyName) {
      throw new BadRequestException(ErrorMessages.customers.companyNameRequired);
    }

    if (type === CustomerType.INDIVIDUAL && !dto.firstName && !dto.lastName) {
      throw new BadRequestException(ErrorMessages.customers.personalNameRequired);
    }

    // Check for duplicate EIK if provided
    if (dto.eik) {
      const existing = await this.prisma.customer.findFirst({
        where: { companyId, eik: dto.eik },
      });
      if (existing) {
        throw new BadRequestException(ErrorMessages.customers.eikExists);
      }
    }

    // Verify country if provided
    if (dto.countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: dto.countryId },
      });
      if (!country) {
        throw new NotFoundException(ErrorMessages.customers.countryNotFound);
      }
    }

    return this.prisma.customer.create({
      data: {
        type,
        companyName: dto.companyName,
        eik: dto.eik,
        vatNumber: dto.vatNumber,
        molName: dto.molName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        countryId: dto.countryId,
        bankName: dto.bankName,
        iban: dto.iban,
        bic: dto.bic,
        notes: dto.notes,
        creditLimit: dto.creditLimit,
        discount: dto.discount,
        isActive: dto.isActive ?? true,
        stage: dto.stage,
        source: dto.source,
        industry: dto.industry,
        size: dto.size,
        website: dto.website,
        description: dto.description,
        tags: dto.tags,
        assignedToId: dto.assignedToId,
        companyId,
      },
      include: {
        country: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { orders: true } },
      },
    });
  }

  async findAll(companyId: string, query: QueryCustomersDto) {
    const {
      search,
      type,
      isActive,
      stage,
      source,
      createdFrom,
      createdTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.CustomerWhereInput = {
      companyId,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(stage && { stage }),
      ...(source && { source }),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom && { gte: new Date(createdFrom) }),
              ...(createdTo && { lte: new Date(createdTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { eik: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          country: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { orders: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        country: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            status: true,
            total: true,
          },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException(ErrorMessages.customers.notFound);
    }

    return customer;
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(companyId, id);

    // Check for duplicate EIK if changing
    if (dto.eik) {
      const existing = await this.prisma.customer.findFirst({
        where: { companyId, eik: dto.eik, NOT: { id } },
      });
      if (existing) {
        throw new BadRequestException(ErrorMessages.customers.eikExists);
      }
    }

    // Verify country if provided
    if (dto.countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: dto.countryId },
      });
      if (!country) {
        throw new NotFoundException(ErrorMessages.customers.countryNotFound);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.eik !== undefined && { eik: dto.eik }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.molName !== undefined && { molName: dto.molName }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.iban !== undefined && { iban: dto.iban }),
        ...(dto.bic !== undefined && { bic: dto.bic }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        country: true,
        _count: { select: { orders: true } },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const customer = await this.findOne(companyId, id);

    // Check if customer has orders
    if (customer._count.orders > 0) {
      throw new BadRequestException(ErrorMessages.customers.cannotDeleteWithOrders);
    }

    await this.prisma.customer.delete({ where: { id } });

    return { message: 'Customer deleted successfully' };
  }

  // Helper method to get customer display name
  getDisplayName(customer: {
    type: CustomerType;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }): string {
    if (customer.type === CustomerType.COMPANY) {
      return customer.companyName || 'Unnamed Company';
    }
    const parts = [customer.firstName, customer.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unnamed Customer';
  }
}
