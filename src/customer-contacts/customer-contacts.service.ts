import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { CreateCustomerContactDto, UpdateCustomerContactDto } from './dto';

/**
 * Лица за контакт на клиента. Всичко е companyId-скопирано; клиентът се
 * проверява и спрямо партньорския обхват (партньорски акаунт вижда само
 * своите клиенти), както останалите customer endpoint-и.
 */
@Injectable()
export class CustomerContactsService {
  constructor(private prisma: PrismaService) {}

  private async assertCustomer(
    companyId: string,
    customerId: string,
    partnerScopeId?: string | null,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        ...(partnerScopeId && {
          OR: [{ id: partnerScopeId }, { referredById: partnerScopeId }],
        }),
      },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException(ErrorMessages.customers.notFound);
    }
  }

  private clean(dto: CreateCustomerContactDto | UpdateCustomerContactDto) {
    const trim = (v: string | undefined) =>
      v === undefined ? undefined : v.trim() || null;
    return {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.position !== undefined && { position: trim(dto.position) }),
      ...(dto.email !== undefined && { email: trim(dto.email) }),
      ...(dto.phone !== undefined && { phone: trim(dto.phone) }),
      ...(dto.note !== undefined && { note: trim(dto.note) }),
      ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
    };
  }

  async findAll(
    companyId: string,
    customerId: string,
    partnerScopeId?: string | null,
  ) {
    await this.assertCustomer(companyId, customerId, partnerScopeId);
    return this.prisma.customerContact.findMany({
      where: { companyId, customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    companyId: string,
    customerId: string,
    dto: CreateCustomerContactDto,
    partnerScopeId?: string | null,
  ) {
    await this.assertCustomer(companyId, customerId, partnerScopeId);
    return this.prisma.$transaction(async (tx) => {
      // Само едно основно лице на клиент
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { companyId, customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.customerContact.create({
        data: {
          ...this.clean(dto),
          name: dto.name.trim(),
          companyId,
          customerId,
        },
      });
    });
  }

  async update(
    companyId: string,
    customerId: string,
    id: string,
    dto: UpdateCustomerContactDto,
    partnerScopeId?: string | null,
  ) {
    await this.assertCustomer(companyId, customerId, partnerScopeId);
    const existing = await this.prisma.customerContact.findFirst({
      where: { id, companyId, customerId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.customerContacts.notFound);
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { companyId, customerId, isPrimary: true, id: { not: id } },
          data: { isPrimary: false },
        });
      }
      return tx.customerContact.update({
        where: { id },
        data: this.clean(dto),
      });
    });
  }

  async remove(
    companyId: string,
    customerId: string,
    id: string,
    partnerScopeId?: string | null,
  ) {
    await this.assertCustomer(companyId, customerId, partnerScopeId);
    const { count } = await this.prisma.customerContact.deleteMany({
      where: { id, companyId, customerId },
    });
    if (count === 0) {
      throw new NotFoundException(ErrorMessages.customerContacts.notFound);
    }
    return { success: true };
  }
}
