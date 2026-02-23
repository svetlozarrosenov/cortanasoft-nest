import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    return this.prisma.currency.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.currency.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.currency.findUnique({
      where: { code },
    });
  }
}
