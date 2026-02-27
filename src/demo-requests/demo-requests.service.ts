import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import {
  CreateDemoRequestDto,
  UpdateDemoRequestDto,
  QueryDemoRequestsDto,
} from './dto';
import { Prisma, DemoRequestStatus } from '@prisma/client';

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private pushNotificationsService: PushNotificationsService,
  ) {}

  /**
   * Create a new demo request (public endpoint, no auth required)
   */
  async create(dto: CreateDemoRequestDto) {
    const demoRequest = await this.prisma.demoRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        employeeCount: dto.employeeCount,
        message: dto.message,
        status: DemoRequestStatus.NEW,
      },
    });

    // Send push notification to all super admin users (users in OWNER companies)
    try {
      const ownerCompanyUsers = await this.prisma.userCompany.findMany({
        where: { company: { role: 'OWNER' } },
        select: { userId: true },
      });

      const adminUserIds = [...new Set(ownerCompanyUsers.map((uc) => uc.userId))];

      if (adminUserIds.length > 0) {
        await this.pushNotificationsService.sendToUsers(adminUserIds, {
          title: 'Нова заявка за демо',
          body: `${dto.companyName} - ${dto.name}`,
          url: '/dashboard/admin/demo-requests',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification for demo request', error);
    }

    return demoRequest;
  }

  /**
   * Get all demo requests with pagination and filters (admin only)
   */
  async findAll(query: QueryDemoRequestsDto) {
    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.DemoRequestWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.demoRequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.demoRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single demo request by ID (admin only)
   */
  async findOne(id: string) {
    const demoRequest = await this.prisma.demoRequest.findUnique({
      where: { id },
    });

    if (!demoRequest) {
      throw new NotFoundException('Demo request not found');
    }

    return demoRequest;
  }

  /**
   * Update a demo request (admin only)
   */
  async update(id: string, dto: UpdateDemoRequestDto) {
    await this.findOne(id);

    return this.prisma.demoRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.contactedAt && { contactedAt: new Date(dto.contactedAt) }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.completedAt && { completedAt: new Date(dto.completedAt) }),
      },
    });
  }

  /**
   * Delete a demo request (admin only)
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.demoRequest.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for demo requests (admin only)
   */
  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.demoRequest.count(),
      this.prisma.demoRequest.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: statusCounts,
    };
  }

  /**
   * Get all possible statuses
   */
  getStatuses() {
    return Object.values(DemoRequestStatus);
  }
}
