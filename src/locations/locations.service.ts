import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
  CreateStorageZoneDto,
  UpdateStorageZoneDto,
} from './dto';
import { Prisma } from '@prisma/client';

// Екип на локацията (бус) — кой служител е зачислен към нея
const MEMBERS_INCLUDE = {
  members: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ==================== LOCATION METHODS ====================

  async create(companyId: string, dto: CreateLocationDto) {
    // Проверка за дублиран код в компанията
    const existingLocation = await this.prisma.location.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: dto.code,
        },
      },
    });

    if (existingLocation) {
      throw new ConflictException(
        `Локация с код "${dto.code}" вече съществува`,
      );
    }

    // Ако е default, премахни default от другите
    if (dto.isDefault) {
      await this.prisma.location.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.location.create({
      data: {
        ...dto,
        companyId,
      },
      include: {
        storageZones: true,
        _count: {
          select: {
            inventoryBatches: true,
            inventorySerials: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, query: QueryLocationsDto) {
    const {
      search,
      type,
      excludeType,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.LocationWhereInput = {
      companyId,
    };

    // Търсене по име или код
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    } else if (excludeType) {
      where.type = { not: excludeType };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [locations, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          storageZones: {
            where: { isActive: true },
            orderBy: { code: 'asc' },
          },
          ...MEMBERS_INCLUDE,
          _count: {
            select: {
              inventoryBatches: true,
              inventorySerials: true,
              storageZones: true,
            },
          },
        },
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: locations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        storageZones: {
          orderBy: { code: 'asc' },
        },
        ...MEMBERS_INCLUDE,
        _count: {
          select: {
            inventoryBatches: true,
            inventorySerials: true,
            goodsReceipts: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Локацията не е намерена');
    }

    return location;
  }

  async update(companyId: string, id: string, dto: UpdateLocationDto) {
    // Проверка дали локацията съществува
    await this.findOne(companyId, id);

    // Проверка за дублиран код ако се променя
    if (dto.code) {
      const existingLocation = await this.prisma.location.findFirst({
        where: {
          companyId,
          code: dto.code,
          NOT: { id },
        },
      });

      if (existingLocation) {
        throw new ConflictException(
          `Локация с код "${dto.code}" вече съществува`,
        );
      }
    }

    // Ако се маркира като default, премахни default от другите
    if (dto.isDefault) {
      await this.prisma.location.updateMany({
        where: { companyId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.location.update({
      where: { id },
      data: dto,
      include: {
        storageZones: true,
        _count: {
          select: {
            inventoryBatches: true,
            inventorySerials: true,
          },
        },
      },
    });
  }

  async remove(companyId: string, id: string) {
    // Проверка дали локацията съществува
    const location = await this.findOne(companyId, id);

    // Проверка дали има наличности
    if (
      location._count.inventoryBatches > 0 ||
      location._count.inventorySerials > 0
    ) {
      throw new ConflictException(
        'Не може да изтриете локация с налични продукти',
      );
    }

    return this.prisma.location.delete({
      where: { id },
    });
  }

  // ==================== LOCATION MEMBERS (ЕКИП) ====================

  // Синхронизира екипа на локацията (бус) към подадения списък от служители.
  async setMembers(companyId: string, locationId: string, userIds: string[]) {
    await this.findOne(companyId, locationId);

    const uniqueIds = [...new Set(userIds)];

    // Всички подадени потребители трябва да са служители на компанията
    if (uniqueIds.length > 0) {
      const validCount = await this.prisma.userCompany.count({
        where: { companyId, userId: { in: uniqueIds } },
      });
      if (validCount !== uniqueIds.length) {
        throw new BadRequestException(
          'Някои от избраните служители не принадлежат на компанията',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.locationMember.deleteMany({
        where: { locationId, userId: { notIn: uniqueIds } },
      }),
      ...uniqueIds.map((userId) =>
        this.prisma.locationMember.upsert({
          where: { locationId_userId: { locationId, userId } },
          create: { locationId, userId },
          update: {},
        }),
      ),
    ]);

    return this.findOne(companyId, locationId);
  }

  // ==================== STORAGE ZONE METHODS ====================

  async createStorageZone(
    companyId: string,
    locationId: string,
    dto: CreateStorageZoneDto,
  ) {
    // Проверка дали локацията съществува
    await this.findOne(companyId, locationId);

    // Проверка за дублиран код в локацията
    const existingZone = await this.prisma.storageZone.findUnique({
      where: {
        locationId_code: {
          locationId,
          code: dto.code,
        },
      },
    });

    if (existingZone) {
      throw new ConflictException(
        `Зона с код "${dto.code}" вече съществува в тази локация`,
      );
    }

    return this.prisma.storageZone.create({
      data: {
        ...dto,
        locationId,
      },
    });
  }

  async findAllStorageZones(companyId: string, locationId: string) {
    // Проверка дали локацията съществува
    await this.findOne(companyId, locationId);

    return this.prisma.storageZone.findMany({
      where: { locationId },
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: {
            inventoryBatches: true,
            inventorySerials: true,
          },
        },
      },
    });
  }

  async findOneStorageZone(
    companyId: string,
    locationId: string,
    zoneId: string,
  ) {
    // Проверка дали локацията съществува
    await this.findOne(companyId, locationId);

    const zone = await this.prisma.storageZone.findFirst({
      where: {
        id: zoneId,
        locationId,
      },
      include: {
        _count: {
          select: {
            inventoryBatches: true,
            inventorySerials: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('Зоната не е намерена');
    }

    return zone;
  }

  async updateStorageZone(
    companyId: string,
    locationId: string,
    zoneId: string,
    dto: UpdateStorageZoneDto,
  ) {
    // Проверка дали зоната съществува
    await this.findOneStorageZone(companyId, locationId, zoneId);

    // Проверка за дублиран код ако се променя
    if (dto.code) {
      const existingZone = await this.prisma.storageZone.findFirst({
        where: {
          locationId,
          code: dto.code,
          NOT: { id: zoneId },
        },
      });

      if (existingZone) {
        throw new ConflictException(
          `Зона с код "${dto.code}" вече съществува в тази локация`,
        );
      }
    }

    return this.prisma.storageZone.update({
      where: { id: zoneId },
      data: dto,
    });
  }

  async removeStorageZone(
    companyId: string,
    locationId: string,
    zoneId: string,
  ) {
    // Проверка дали зоната съществува
    const zone = await this.findOneStorageZone(companyId, locationId, zoneId);

    // Проверка дали има наличности
    if (zone._count.inventoryBatches > 0 || zone._count.inventorySerials > 0) {
      throw new ConflictException(
        'Не може да изтриете зона с налични продукти',
      );
    }

    return this.prisma.storageZone.delete({
      where: { id: zoneId },
    });
  }
}
