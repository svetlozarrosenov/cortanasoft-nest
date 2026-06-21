import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContractDto,
  QueryContractsDto,
  UpdateContractDto,
} from './dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateContractDto) {
    // Префил на контрагента от клиент (ако е подаден и полетата липсват)
    let counterparty = {
      counterpartyName: dto.counterpartyName,
      counterpartyEik: dto.counterpartyEik,
      counterpartyAddress: dto.counterpartyAddress,
      counterpartyContact: dto.counterpartyContact,
    };

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException('Клиентът не е намерен');
      }
      counterparty = this.mergeCounterparty(counterparty, customer);
    }

    if (!counterparty.counterpartyName) {
      throw new BadRequestException(
        'Името на контрагента е задължително (или изберете клиент)',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const number = dto.number ?? (await this.nextNumber(companyId, tx));
      return tx.contract.create({
        data: {
          companyId,
          number,
          title: dto.title,
          customerId: dto.customerId ?? null,
          counterpartyName: counterparty.counterpartyName!,
          counterpartyEik: counterparty.counterpartyEik ?? null,
          counterpartyAddress: counterparty.counterpartyAddress ?? null,
          counterpartyContact: counterparty.counterpartyContact ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          notes: dto.notes ?? null,
        },
      });
    });
  }

  async findAll(companyId: string, query: QueryContractsDto) {
    const {
      search,
      customerId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ContractWhereInput = { companyId };
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { counterpartyName: { contains: search, mode: 'insensitive' } },
        { counterpartyEik: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: { select: { files: true } },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            eik: true,
          },
        },
        files: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!contract) {
      throw new NotFoundException('Договорът не е намерен');
    }
    return contract;
  }

  async update(companyId: string, id: string, dto: UpdateContractDto) {
    await this.findOne(companyId, id);

    let counterparty = {
      counterpartyName: dto.counterpartyName,
      counterpartyEik: dto.counterpartyEik,
      counterpartyAddress: dto.counterpartyAddress,
      counterpartyContact: dto.counterpartyContact,
    };

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException('Клиентът не е намерен');
      }
      counterparty = this.mergeCounterparty(counterparty, customer);
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.customerId !== undefined
          ? { customerId: dto.customerId || null }
          : {}),
        ...(counterparty.counterpartyName !== undefined
          ? { counterpartyName: counterparty.counterpartyName }
          : {}),
        ...(counterparty.counterpartyEik !== undefined
          ? { counterpartyEik: counterparty.counterpartyEik }
          : {}),
        ...(counterparty.counterpartyAddress !== undefined
          ? { counterpartyAddress: counterparty.counterpartyAddress }
          : {}),
        ...(counterparty.counterpartyContact !== undefined
          ? { counterpartyContact: counterparty.counterpartyContact }
          : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    // ContractFile е onDelete: Cascade — но файловете в R2 ги трием явно
    const files = await this.prisma.contractFile.findMany({
      where: { contractId: id },
      select: { id: true },
    });
    await this.prisma.contract.delete({ where: { id } });
    return { message: 'Договорът е изтрит успешно', removedFiles: files.length };
  }

  /** Попълва липсващите counterparty полета от запис на клиент. */
  private mergeCounterparty(
    current: {
      counterpartyName?: string;
      counterpartyEik?: string;
      counterpartyAddress?: string;
      counterpartyContact?: string;
    },
    customer: {
      type: string;
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      eik: string | null;
      address: string | null;
      city: string | null;
      email: string | null;
      phone: string | null;
    },
  ) {
    const fullName =
      customer.type === 'COMPANY'
        ? customer.companyName
        : [customer.firstName, customer.lastName].filter(Boolean).join(' ');
    const address = [customer.address, customer.city]
      .filter(Boolean)
      .join(', ');
    const contact = customer.email || customer.phone || '';

    return {
      counterpartyName: current.counterpartyName || fullName || '',
      counterpartyEik: current.counterpartyEik || customer.eik || undefined,
      counterpartyAddress:
        current.counterpartyAddress || address || undefined,
      counterpartyContact:
        current.counterpartyContact || contact || undefined,
    };
  }

  /** CT-2026-00001 — извиква се вътре в $transaction за да избегне race. */
  private async nextNumber(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CT-${year}-`;
    const last = await tx.contract.findFirst({
      where: { companyId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const lastNum = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
    const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
    return `${prefix}${next.toString().padStart(5, '0')}`;
  }
}
