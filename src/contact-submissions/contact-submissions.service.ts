import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContactSubmissionDto,
  UpdateContactSubmissionDto,
  QueryContactSubmissionsDto,
} from './dto';
import { Prisma, ContactSubmissionStatus } from '@prisma/client';

@Injectable()
export class ContactSubmissionsService {
  private readonly logger = new Logger(ContactSubmissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new contact submission (public endpoint, no auth required)
   */
  async create(dto: CreateContactSubmissionDto) {
    return this.prisma.contactSubmission.create({
      data: {
        name: dto.name,
        email: dto.email,
        company: dto.company,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
        status: ContactSubmissionStatus.NEW,
      },
    });
  }

  /**
   * Get all contact submissions with pagination and filters (admin only)
   */
  async findAll(query: QueryContactSubmissionsDto) {
    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ContactSubmissionWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactSubmission.count({ where }),
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
   * Get a single contact submission by ID (admin only)
   */
  async findOne(id: string) {
    const submission = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    return submission;
  }

  /**
   * Update a contact submission (admin only)
   */
  async update(id: string, dto: UpdateContactSubmissionDto) {
    await this.findOne(id);

    return this.prisma.contactSubmission.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.repliedAt && { repliedAt: new Date(dto.repliedAt) }),
      },
    });
  }

  /**
   * Delete a contact submission (admin only)
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.contactSubmission.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for contact submissions (admin only)
   */
  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.contactSubmission.count(),
      this.prisma.contactSubmission.groupBy({
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
    return Object.values(ContactSubmissionStatus);
  }
}
