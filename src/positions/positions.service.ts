import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto, UpdatePositionDto } from './dto';

/** Длъжности на компанията с типово заплащане на час (HR > Позиции) */
@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string, includeInactive = false) {
    return this.prisma.position.findMany({
      where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const position = await this.prisma.position.findFirst({
      where: { id, companyId },
      include: { _count: { select: { members: true } } },
    });
    if (!position) throw new NotFoundException('Позицията не е намерена');
    return position;
  }

  async create(companyId: string, dto: CreatePositionDto) {
    await this.assertUniqueName(companyId, dto.name);
    return this.prisma.position.create({
      data: {
        companyId,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        description: dto.description?.trim() || null,
        hourlyRate: dto.hourlyRate ?? null,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async update(companyId: string, id: string, dto: UpdatePositionDto) {
    await this.findOne(companyId, id);
    if (dto.name !== undefined) await this.assertUniqueName(companyId, dto.name, id);
    return this.prisma.position.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.hourlyRate !== undefined ? { hourlyRate: dto.hourlyRate } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { _count: { select: { members: true } } },
    });
  }

  // Позиция със служители не се трие — деактивира се, за да не губим
  // историята на заплащането
  async remove(companyId: string, id: string) {
    const position = await this.findOne(companyId, id);
    if (position._count.members > 0) {
      throw new BadRequestException(
        'Позицията има служители. Премахнете я от тях или я деактивирайте.',
      );
    }
    await this.prisma.position.delete({ where: { id } });
    return { success: true };
  }

  private async assertUniqueName(companyId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.position.findFirst({
      where: {
        companyId,
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException('Вече има позиция с това име');
  }
}
