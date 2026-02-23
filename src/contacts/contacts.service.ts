import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto, QueryContactsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateContactDto) {
    // Verify customer exists and belongs to the company
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If this contact is set as primary, unset other primary contacts for this customer
    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: {
          customerId: dto.customerId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.contact.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        department: dto.department,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        linkedIn: dto.linkedIn,
        skype: dto.skype,
        notes: dto.notes,
        isPrimary: dto.isPrimary ?? false,
        isActive: dto.isActive ?? true,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        customerId: dto.customerId,
        companyId,
      },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, query: QueryContactsDto) {
    const {
      search,
      customerId,
      isActive,
      isPrimary,
      department,
      page = 1,
      limit = 20,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = query;

    const where: Prisma.ContactWhereInput = {
      companyId,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isPrimary !== undefined) {
      where.isPrimary = isPrimary;
    }

    if (department) {
      where.department = {
        contains: department,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const allowedSortFields = [
      'firstName',
      'lastName',
      'email',
      'jobTitle',
      'department',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'lastName';
    const orderByDirection = sortOrder === 'desc' ? 'desc' : 'asc';

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              type: true,
              companyName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [orderByField]: orderByDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
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
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(companyId: string, id: string, dto: UpdateContactDto) {
    // Verify contact exists and belongs to the company
    const existing = await this.prisma.contact.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    // If this contact is set as primary, unset other primary contacts for this customer
    if (dto.isPrimary === true) {
      await this.prisma.contact.updateMany({
        where: {
          customerId: existing.customerId,
          isPrimary: true,
          id: { not: id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile }),
        ...(dto.linkedIn !== undefined && { linkedIn: dto.linkedIn }),
        ...(dto.skype !== undefined && { skype: dto.skype }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
      },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({
      where: { id },
    });

    return { message: 'Contact deleted successfully' };
  }

  async setAsPrimary(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Unset other primary contacts for this customer
    await this.prisma.contact.updateMany({
      where: {
        customerId: contact.customerId,
        isPrimary: true,
        id: { not: id },
      },
      data: {
        isPrimary: false,
      },
    });

    // Set this contact as primary
    return this.prisma.contact.update({
      where: { id },
      data: { isPrimary: true },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByCustomer(companyId: string, customerId: string) {
    // Verify customer exists and belongs to the company
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.contact.findMany({
      where: {
        customerId,
        companyId,
      },
      orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
    });
  }
}
