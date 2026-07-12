import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomersDto,
  TransferReferralsDto,
} from './dto';
import { Prisma, CustomerType } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // Инварианти на партньорския модел (Odoo-style resellers):
  //  - партньор (isPartner) не може сам да е „доведен от" друг партньор
  //  - referredById сочи само клиент от същата компания с isPartner=true
  //  - клиент не може да е доведен сам от себе си
  // Подава се ФИНАЛНОТО състояние (след прилагане на dto върху съществуващия
  // запис), за да не се заобиколи инвариантът с частичен PATCH.
  private async validatePartnerInvariants(
    companyId: string,
    finalState: { isPartner: boolean; referredById: string | null },
    customerId?: string,
  ) {
    const { isPartner, referredById } = finalState;

    if (isPartner && referredById) {
      throw new BadRequestException(
        'Партньор не може да бъде отбелязан като доведен от друг партньор.',
      );
    }

    if (!referredById) return;

    if (customerId && referredById === customerId) {
      throw new BadRequestException(
        'Клиентът не може да бъде доведен сам от себе си.',
      );
    }

    const referrer = await this.prisma.customer.findFirst({
      where: { id: referredById, companyId },
      select: { id: true, isPartner: true },
    });
    if (!referrer) {
      throw new NotFoundException('Избраният партньор не е намерен.');
    }
    if (!referrer.isPartner) {
      throw new BadRequestException(
        'Клиентът в „Доведен от" трябва да бъде маркиран като партньор.',
      );
    }
  }

  async create(
    companyId: string,
    dto: CreateCustomerDto,
    partnerScopeId?: string | null,
    canManagePartners = false,
  ) {
    // Validate based on type
    const type = dto.type || CustomerType.INDIVIDUAL;

    if (type === CustomerType.COMPANY && !dto.companyName) {
      throw new BadRequestException(ErrorMessages.customers.companyNameRequired);
    }

    if (type === CustomerType.INDIVIDUAL && !dto.firstName && !dto.lastName) {
      throw new BadRequestException(ErrorMessages.customers.personalNameRequired);
    }

    // Check for duplicate email within the same company
    if (dto.email) {
      const existingByEmail = await this.prisma.customer.findFirst({
        where: { companyId, email: dto.email },
      });
      if (existingByEmail) {
        throw new BadRequestException('Клиент с този имейл вече съществува в тази компания.');
      }
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

    // Партньорски акаунт може да създава клиенти само доведени от неговия
    // партньор — иначе би си "осиновявал" чужди клиенти или създавал скрити.
    let isPartner = dto.isPartner ?? false;
    let referredById = dto.referredById || null;
    if (partnerScopeId) {
      isPartner = false;
      referredById = partnerScopeId;
    } else if ((isPartner || referredById) && !canManagePartners) {
      // Партньорските полета изискват правото CRM > Партньори (редакция) —
      // задава се от Администрация > Компании > Роли
      throw new ForbiddenException(
        'Нямате право да управлявате партньори. Изисква се право „Партньори (редакция)" в CRM.',
      );
    }
    await this.validatePartnerInvariants(companyId, { isPartner, referredById });

    const customer = await this.prisma.customer.create({
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
        searchTerms: dto.searchTerms,
        assignedToId: dto.assignedToId,
        isPartner,
        referredById,
        companyId,
      },
      include: {
        country: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        referredBy: {
          select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
        },
        _count: { select: { orders: true, referrals: true } },
      },
    });

    return customer;
  }

  async findAll(
    companyId: string,
    query: QueryCustomersDto,
    partnerScopeId?: string | null,
  ) {
    const {
      search,
      type,
      isActive,
      stage,
      source,
      isPartner,
      referredById,
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
      ...(isPartner !== undefined && { isPartner }),
      ...(referredById && { referredById }),
      // Партньорски акаунт вижда само своя партньорски картон + доведените
      // от него клиенти. AND, за да не се смеси с OR-а на search.
      ...(partnerScopeId && {
        AND: [
          { OR: [{ id: partnerScopeId }, { referredById: partnerScopeId }] },
        ],
      }),
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
          // Ключови думи за търсене — „Хепи Варна" намира фирмата зад обекта
          { searchTerms: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          country: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          referredBy: {
            select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
          },
          _count: { select: { orders: true, referrals: true } },
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

  async findOne(companyId: string, id: string, partnerScopeId?: string | null) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
        // Партньорски акаунт достъпва само своя картон + доведените клиенти
        ...(partnerScopeId && {
          OR: [{ id: partnerScopeId }, { referredById: partnerScopeId }],
        }),
      },
      include: {
        country: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        referredBy: {
          select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
        },
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
        _count: { select: { orders: true, referrals: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException(ErrorMessages.customers.notFound);
    }

    return customer;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCustomerDto,
    partnerScopeId?: string | null,
    canManagePartners = false,
  ) {
    const existing = await this.findOne(companyId, id, partnerScopeId);

    // Промяна на партньорските полета изисква правото CRM > Партньори
    // (редакция). Сравняваме срещу текущите стойности, за да не блокираме
    // редакция на несвързани полета, когато frontend праща целия обект.
    if (!partnerScopeId && !canManagePartners) {
      const changesPartnerFields =
        (dto.isPartner !== undefined && dto.isPartner !== existing.isPartner) ||
        (dto.referredById !== undefined &&
          (dto.referredById || null) !== existing.referredById);
      if (changesPartnerFields) {
        throw new ForbiddenException(
          'Нямате право да управлявате партньори. Изисква се право „Партньори (редакция)" в CRM.',
        );
      }
      delete dto.isPartner;
      delete dto.referredById;
    }

    // Партньорски акаунт не може да мести клиенти между партньори, нито да
    // променя партньорския статус — полетата се заключват към текущите му.
    if (partnerScopeId) {
      if (
        (dto.isPartner !== undefined && dto.isPartner !== existing.isPartner) ||
        (dto.referredById !== undefined &&
          (dto.referredById || null) !== existing.referredById)
      ) {
        throw new BadRequestException(
          'Партньорски акаунт не може да променя партньорската принадлежност на клиент.',
        );
      }
      delete dto.isPartner;
      delete dto.referredById;
    }

    // Валидираме ФИНАЛНОТО състояние (dto върху съществуващия запис), за да
    // не се заобиколят инвариантите с частичен PATCH (напр. само isPartner:
    // true върху клиент, който вече има referredById).
    const nextIsPartner =
      dto.isPartner !== undefined ? dto.isPartner : existing.isPartner;
    const nextReferredById =
      dto.referredById !== undefined
        ? dto.referredById || null
        : existing.referredById;
    await this.validatePartnerInvariants(
      companyId,
      { isPartner: nextIsPartner, referredById: nextReferredById },
      id,
    );

    // Сваляне на партньорски статус: само ако никой не зависи от него —
    // иначе доведените клиенти/акаунти биха сочили към не-партньор.
    if (existing.isPartner && nextIsPartner === false) {
      const [referralsCount, partnerAccountsCount] = await Promise.all([
        this.prisma.customer.count({ where: { referredById: id } }),
        this.prisma.userCompany.count({ where: { partnerCustomerId: id } }),
      ]);
      if (referralsCount > 0) {
        throw new BadRequestException(
          `Клиентът не може да спре да бъде партньор — има ${referralsCount} доведени клиенти. Първо ги прехвърлете или отвържете.`,
        );
      }
      if (partnerAccountsCount > 0) {
        throw new BadRequestException(
          'Клиентът не може да спре да бъде партньор — има асоцииран партньорски потребителски акаунт. Първо премахнете асоциацията от Администрация > Компании.',
        );
      }
    }

    // Check for duplicate email if changing
    if (dto.email) {
      const existingByEmail = await this.prisma.customer.findFirst({
        where: { companyId, email: dto.email, NOT: { id } },
      });
      if (existingByEmail) {
        throw new BadRequestException('Клиент с този имейл вече съществува в тази компания.');
      }
    }

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
        ...(dto.stage !== undefined && { stage: dto.stage }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.searchTerms !== undefined && { searchTerms: dto.searchTerms || null }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.isPartner !== undefined && { isPartner: dto.isPartner }),
        ...(dto.referredById !== undefined && {
          referredById: dto.referredById || null,
        }),
      },
      include: {
        country: true,
        referredBy: {
          select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
        },
        _count: { select: { orders: true, referrals: true } },
      },
    });
  }

  async remove(companyId: string, id: string, partnerScopeId?: string | null) {
    const customer = await this.findOne(companyId, id, partnerScopeId);

    // Check if customer has orders
    if (customer._count.orders > 0) {
      throw new BadRequestException(ErrorMessages.customers.cannotDeleteWithOrders);
    }

    // Партньор с доведени клиенти, асоциирани акаунти или исторически оборот
    // (Order.partnerCustomerId snapshot) не се трие — иначе губим атрибуцията.
    if (customer.isPartner) {
      const [referralsCount, partnerAccountsCount, attributedOrdersCount] =
        await Promise.all([
          this.prisma.customer.count({ where: { referredById: id } }),
          this.prisma.userCompany.count({ where: { partnerCustomerId: id } }),
          this.prisma.order.count({ where: { partnerCustomerId: id } }),
        ]);
      if (referralsCount > 0 || partnerAccountsCount > 0) {
        throw new BadRequestException(
          'Партньорът не може да бъде изтрит — има доведени клиенти или асоцииран потребителски акаунт.',
        );
      }
      if (attributedOrdersCount > 0) {
        throw new BadRequestException(
          'Партньорът не може да бъде изтрит — има поръчки, числени към него. Може да го деактивирате вместо това.',
        );
      }
    }

    await this.prisma.customer.delete({ where: { id } });

    return { message: 'Customer deleted successfully' };
  }

  // Прехвърляне на всички доведени клиенти от един партньор към друг (при
  // смяна/прекратяване на договор). Пипа само Customer.referredById —
  // историческият оборот остава по Order.partnerCustomerId snapshot-а на
  // стария партньор.
  async transferReferrals(companyId: string, dto: TransferReferralsDto) {
    const { fromPartnerId, toPartnerId } = dto;

    if (fromPartnerId === toPartnerId) {
      throw new BadRequestException(
        'Изходният и целевият партньор не може да са един и същ.',
      );
    }

    const [fromPartner, toPartner] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: fromPartnerId, companyId },
        select: { id: true, isPartner: true },
      }),
      this.prisma.customer.findFirst({
        where: { id: toPartnerId, companyId },
        select: { id: true, isPartner: true },
      }),
    ]);

    if (!fromPartner) {
      throw new NotFoundException('Изходният партньор не е намерен.');
    }
    if (!toPartner) {
      throw new NotFoundException('Целевият партньор не е намерен.');
    }
    // Изходният може вече да е демаркиран (прекратен договор) — допустимо е.
    // Целевият обаче трябва да е действащ партньор.
    if (!toPartner.isPartner) {
      throw new BadRequestException(
        'Целевият клиент трябва да бъде маркиран като партньор.',
      );
    }

    const result = await this.prisma.customer.updateMany({
      where: { companyId, referredById: fromPartnerId },
      data: { referredById: toPartnerId },
    });

    return { transferred: result.count };
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
