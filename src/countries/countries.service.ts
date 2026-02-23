import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean, isEU?: boolean) {
    return this.prisma.country.findMany({
      where: {
        ...(isActive !== undefined && { isActive }),
        ...(isEU !== undefined && { isEU }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.country.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.country.findUnique({
      where: { code },
    });
  }
}
