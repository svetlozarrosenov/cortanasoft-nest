import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Полиморфна карта: тип документ → Prisma модел (всички имат
// notifiedEmployeeAt + deliveryConfirmedAt колони).
const NOTIFY_MODEL_MAP = {
  employmentContract: 'employmentContract',
  employmentAnnex: 'employmentAnnex',
  employmentOrder: 'employmentOrder',
  jobDescription: 'jobDescription',
  termination: 'termination',
  employeeDocument: 'employeeDocument',
} as const;

type NotifyEntityType = keyof typeof NOTIFY_MODEL_MAP;

@Injectable()
export class EmployeeRecordNotificationsService {
  constructor(private prisma: PrismaService) {}

  private model(entityType: string) {
    const model = NOTIFY_MODEL_MAP[entityType as NotifyEntityType];
    if (!model) {
      throw new BadRequestException(
        `Невалиден тип: ${entityType}. Позволени: ${Object.keys(NOTIFY_MODEL_MAP).join(', ')}`,
      );
    }
    return model;
  }

  private async ensureExists(model: string, companyId: string, id: string) {
    const entity = await (this.prisma[model] as any).findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Документът не е намерен');
  }

  /** Уведомяване на служителя (наредба) — записва момента. */
  async notify(companyId: string, entityType: string, id: string) {
    const model = this.model(entityType);
    await this.ensureExists(model, companyId, id);
    return (this.prisma[model] as any).update({
      where: { id },
      data: { notifiedEmployeeAt: new Date() },
    });
  }

  /** Потвърждаване на получаване (наредба). */
  async confirmDelivery(companyId: string, entityType: string, id: string) {
    const model = this.model(entityType);
    await this.ensureExists(model, companyId, id);
    return (this.prisma[model] as any).update({
      where: { id },
      data: { deliveryConfirmedAt: new Date() },
    });
  }
}
