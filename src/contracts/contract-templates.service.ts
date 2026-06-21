import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
} from './dto';

@Injectable()
export class ContractTemplatesService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, dto: CreateContractTemplateDto) {
    return this.prisma.contractTemplate.create({
      data: { ...dto, companyId },
    });
  }

  findAll(companyId: string, activeOnly = false) {
    return this.prisma.contractTemplate.findMany({
      where: { companyId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id, companyId },
    });
    if (!template) {
      throw new NotFoundException('Шаблонът не е намерен');
    }
    return template;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateContractTemplateDto,
  ) {
    await this.findOne(companyId, id);
    return this.prisma.contractTemplate.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.contractTemplate.delete({ where: { id } });
    return { message: 'Шаблонът е изтрит успешно' };
  }
}
