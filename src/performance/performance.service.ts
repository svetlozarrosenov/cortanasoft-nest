import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePerformanceReviewDto,
  UpdatePerformanceReviewDto,
  QueryPerformanceReviewDto,
  PerformanceReviewStatus,
} from './dto';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreatePerformanceReviewDto) {
    // Verify user exists and is part of company
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId: dto.userId,
        companyId,
      },
    });

    if (!userCompany) {
      throw new BadRequestException('User is not part of this company');
    }

    // Verify reviewer if provided
    if (dto.reviewerId) {
      const reviewerCompany = await this.prisma.userCompany.findFirst({
        where: {
          userId: dto.reviewerId,
          companyId,
        },
      });

      if (!reviewerCompany) {
        throw new BadRequestException('Reviewer is not part of this company');
      }
    }

    const { items, ...reviewData } = dto;

    return this.prisma.performanceReview.create({
      data: {
        ...reviewData,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        companyId,
        items: items
          ? {
              create: items.map((item) => ({
                type: item.type,
                name: item.name,
                description: item.description,
                weight: item.weight,
                targetValue: item.targetValue,
                actualValue: item.actualValue,
                rating: item.rating,
                score: item.score,
                comments: item.comments,
                selfRating: item.selfRating,
                selfScore: item.selfScore,
                selfComments: item.selfComments,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async findAll(companyId: string, query: QueryPerformanceReviewDto) {
    const {
      search,
      status,
      type,
      userId,
      reviewerId,
      periodFrom,
      periodTo,
      year,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (periodFrom) {
      where.periodStart = {
        ...where.periodStart,
        gte: new Date(periodFrom),
      };
    }

    if (periodTo) {
      where.periodEnd = {
        ...where.periodEnd,
        lte: new Date(periodTo),
      };
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      where.periodStart = {
        ...where.periodStart,
        gte: startOfYear,
      };
      where.periodEnd = {
        ...where.periodEnd,
        lte: endOfYear,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.performanceReview.count({ where }),
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
    const review = await this.prisma.performanceReview.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Performance review not found');
    }

    return review;
  }

  async update(companyId: string, id: string, dto: UpdatePerformanceReviewDto) {
    const review = await this.findOne(companyId, id);

    if (review.status === 'COMPLETED' || review.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot update a completed or cancelled review',
      );
    }

    const { items, ...reviewData } = dto;

    // Update items if provided
    if (items) {
      // Delete existing items and create new ones
      await this.prisma.performanceReviewItem.deleteMany({
        where: { reviewId: id },
      });

      await this.prisma.performanceReviewItem.createMany({
        data: items.map((item) => ({
          reviewId: id,
          type: item.type,
          name: item.name,
          description: item.description,
          weight: item.weight,
          targetValue: item.targetValue,
          actualValue: item.actualValue,
          rating: item.rating,
          score: item.score,
          comments: item.comments,
          selfRating: item.selfRating,
          selfScore: item.selfScore,
          selfComments: item.selfComments,
        })),
      });
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        ...reviewData,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const review = await this.findOne(companyId, id);

    if (review.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed review');
    }

    await this.prisma.performanceReview.delete({
      where: { id },
    });

    return { success: true, message: 'Performance review deleted' };
  }

  // Workflow actions

  async startReview(companyId: string, id: string) {
    const review = await this.findOne(companyId, id);

    if (review.status !== 'DRAFT' && review.status !== 'PENDING') {
      throw new BadRequestException(
        'Can only start reviews in DRAFT or PENDING status',
      );
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async submitForReview(companyId: string, id: string) {
    const review = await this.findOne(companyId, id);

    if (review.status !== 'DRAFT') {
      throw new BadRequestException('Can only submit reviews in DRAFT status');
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async complete(companyId: string, id: string) {
    const review = await this.findOne(companyId, id);

    if (review.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Can only complete reviews that are in progress',
      );
    }

    // Calculate overall score from items if not set
    let overallScore: number | null = review.overallScore
      ? Number(review.overallScore)
      : null;
    if (!overallScore && review.items.length > 0) {
      const itemsWithScores = review.items.filter((item) => item.score);
      if (itemsWithScores.length > 0) {
        const totalWeight = itemsWithScores.reduce(
          (sum, item) => sum + Number(item.weight || 1),
          0,
        );
        const weightedScore = itemsWithScores.reduce(
          (sum, item) => sum + Number(item.score) * Number(item.weight || 1),
          0,
        );
        overallScore = weightedScore / totalWeight;
      }
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        overallScore,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  async cancel(companyId: string, id: string) {
    const review = await this.findOne(companyId, id);

    if (review.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed review');
    }

    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });
  }

  // Statistics
  async getSummary(companyId: string, year?: number) {
    const where: any = { companyId };

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      where.periodStart = { gte: startOfYear };
      where.periodEnd = { lte: endOfYear };
    }

    const reviews = await this.prisma.performanceReview.findMany({
      where,
      select: {
        status: true,
        overallScore: true,
        overallRating: true,
        type: true,
      },
    });

    const completedReviews = reviews.filter((r) => r.status === 'COMPLETED');
    const avgScore =
      completedReviews.length > 0
        ? completedReviews
            .filter((r) => r.overallScore)
            .reduce((sum, r) => sum + Number(r.overallScore), 0) /
          completedReviews.filter((r) => r.overallScore).length
        : 0;

    const ratingCounts = {
      EXCEPTIONAL: 0,
      EXCEEDS: 0,
      MEETS: 0,
      NEEDS_IMPROVEMENT: 0,
      UNSATISFACTORY: 0,
    };

    completedReviews.forEach((r) => {
      if (r.overallRating && ratingCounts[r.overallRating] !== undefined) {
        ratingCounts[r.overallRating]++;
      }
    });

    const statusCounts = {
      DRAFT: 0,
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    reviews.forEach((r) => {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      }
    });

    const typeCounts: Record<string, number> = {};
    reviews.forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    return {
      totalReviews: reviews.length,
      completedReviews: completedReviews.length,
      averageScore: Math.round(avgScore * 100) / 100,
      statusCounts,
      ratingCounts,
      typeCounts,
    };
  }
}
