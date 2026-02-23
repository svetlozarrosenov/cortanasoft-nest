import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementType } from '@prisma/client';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    countryId?: string;
    region?: string;
    municipality?: string;
    type?: SettlementType;
    search?: string;
    isActive?: boolean;
    limit?: number;
  }) {
    const {
      countryId,
      region,
      municipality,
      type,
      search,
      isActive,
      limit = 100,
    } = params || {};

    return this.prisma.settlement.findMany({
      where: {
        ...(countryId && { countryId }),
        ...(region && { region }),
        ...(municipality && { municipality }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { postalCode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        country: true,
      },
      orderBy: [
        { type: 'asc' }, // CAPITAL first, then CITY, TOWN, VILLAGE
        { name: 'asc' },
      ],
      take: limit,
    });
  }

  async findOne(id: string) {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: {
        country: true,
      },
    });
  }

  async findByEkatte(ekatte: string) {
    return this.prisma.settlement.findUnique({
      where: { ekatte },
      include: {
        country: true,
      },
    });
  }

  async getRegions(countryId: string) {
    const results = await this.prisma.settlement.findMany({
      where: { countryId, isActive: true },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    });

    return results.map((r) => r.region).filter((r): r is string => r !== null);
  }

  async getMunicipalities(countryId: string, region?: string) {
    const results = await this.prisma.settlement.findMany({
      where: {
        countryId,
        isActive: true,
        ...(region && { region }),
      },
      select: { municipality: true },
      distinct: ['municipality'],
      orderBy: { municipality: 'asc' },
    });

    return results
      .map((r) => r.municipality)
      .filter((r): r is string => r !== null);
  }
}
