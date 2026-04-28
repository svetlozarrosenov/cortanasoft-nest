import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { ServiceNumberingService } from './service-numbering.service';
import {
  CreateServiceAssetDto,
  UpdateServiceAssetDto,
  QueryServiceAssetsDto,
} from './dto';

const ASSET_INCLUDE = {
  customer: true,
  product: true,
  warranty: true,
  _count: { select: { serviceOrders: true } },
} as const;

@Injectable()
export class ServiceAssetsService {
  constructor(
    private prisma: PrismaService,
    private numbering: ServiceNumberingService,
  ) {}

  async create(companyId: string, dto: CreateServiceAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.customers.notFound);
      }

      const assetNumber =
        dto.assetNumber || (await this.numbering.next('asset', companyId, tx));

      return tx.serviceAsset.create({
        data: {
          companyId,
          assetNumber,
          name: dto.name,
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          imei: dto.imei,
          vin: dto.vin,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
          notes: dto.notes,
          status: dto.status || 'ACTIVE',
          customerId: dto.customerId,
          productId: dto.productId,
          warrantyId: dto.warrantyId,
        },
        include: ASSET_INCLUDE,
      });
    });
  }

  async findAll(companyId: string, query: QueryServiceAssetsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.ServiceAssetWhereInput = { companyId };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { assetNumber: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { imei: { contains: s, mode: 'insensitive' } },
        { vin: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.serviceAsset.findMany({
        where,
        include: ASSET_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceAsset.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const asset = await this.prisma.serviceAsset.findFirst({
      where: { id, companyId },
      include: {
        ...ASSET_INCLUDE,
        serviceOrders: {
          orderBy: { receivedAt: 'desc' },
          take: 50,
          include: {
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException('Активът не е намерен');
    }
    return asset;
  }

  async update(companyId: string, id: string, dto: UpdateServiceAssetDto) {
    await this.findOne(companyId, id);
    return this.prisma.serviceAsset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
      include: ASSET_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.serviceAsset.delete({ where: { id } });
  }

  async lookupBySerial(companyId: string, serial: string) {
    return this.prisma.serviceAsset.findFirst({
      where: {
        companyId,
        OR: [
          { serialNumber: serial },
          { imei: serial },
          { vin: serial },
        ],
      },
      include: ASSET_INCLUDE,
    });
  }
}
