import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { MailService } from '../mail/mail.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

// Полиморфна карта: тип документ → Prisma модел (всички имат userId +
// notifiedEmployeeAt + deliveryConfirmedAt/ById колони).
// Длъжностните характеристики са на ниво длъжност (не се уведомяват per служител),
// затова не са тук.
const NOTIFY_MODEL_MAP = {
  employmentContract: 'employmentContract',
  employmentAnnex: 'employmentAnnex',
  employmentOrder: 'employmentOrder',
  termination: 'termination',
  employeeDocument: 'employeeDocument',
} as const;

const TYPE_LABELS: Record<NotifyEntityType, string> = {
  employmentContract: 'трудов договор',
  employmentAnnex: 'допълнително споразумение',
  employmentOrder: 'заповед',
  termination: 'прекратяване',
  employeeDocument: 'документ',
};

type NotifyEntityType = keyof typeof NOTIFY_MODEL_MAP;

/**
 * Уведомяване и връчване по наредбата. Уведомяването реално известява
 * служителя (push + имейл с линк към „Моето досие"); потвърждаването на
 * получаване е действие НА СЛУЖИТЕЛЯ (или ръчно от HR — напр. при
 * връчване на хартия). Пълноценното електронно връчване с доказателствена
 * сила (е-препоръчана поща, чл. 4, ал. 4) ще мине през Евротръст QERDS —
 * виж EvrotrustService (заготовка).
 */
@Injectable()
export class EmployeeRecordNotificationsService {
  private readonly logger = new Logger(EmployeeRecordNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
    private mail: MailService,
    private audit: EmployeeRecordAuditService,
  ) {}

  private model(entityType: string): NotifyEntityType {
    const model = NOTIFY_MODEL_MAP[entityType as NotifyEntityType];
    if (!model) {
      throw new BadRequestException(
        `Невалиден тип: ${entityType}. Позволени: ${Object.keys(NOTIFY_MODEL_MAP).join(', ')}`,
      );
    }
    return model;
  }

  private async load(model: string, companyId: string, id: string) {
    const entity = await (this.prisma[model] as any).findFirst({
      where: { id, companyId },
    });
    if (!entity) throw new NotFoundException('Документът не е намерен');
    return entity as {
      id: string;
      userId: string;
      number?: string;
      subject?: string;
      title?: string;
      notifiedEmployeeAt: Date | null;
      deliveryConfirmedAt: Date | null;
    };
  }

  private docLabel(type: NotifyEntityType, entity: { number?: string; subject?: string; title?: string }) {
    const name = entity.number || entity.title || entity.subject || '';
    return `${TYPE_LABELS[type]}${name ? ` ${name}` : ''}`;
  }

  /**
   * Уведомяване на служителя (чл. 3): записва момента И реално известява
   * служителя с push + имейл, с линк към „Моето досие", където той може да
   * прегледа документа и да потвърди получаването.
   */
  async notify(
    companyId: string,
    entityType: string,
    id: string,
    actor: { id: string; email?: string },
  ) {
    const model = this.model(entityType);
    const entity = await this.load(model, companyId, id);
    const label = this.docLabel(model, entity);

    const updated = await (this.prisma[model] as any).update({
      where: { id },
      data: { notifiedEmployeeAt: new Date() },
    });

    const url = `/dashboard/${companyId}/employee-records/my`;

    // Push (best-effort)
    this.push
      .sendToUser(entity.userId, {
        title: 'Нов документ в трудовото ви досие',
        body: `Получихте ${label}. Моля, прегледайте и потвърдете получаването.`,
        url,
        tag: `employee-record-${id}`,
      })
      .catch((err) =>
        this.logger.error('Failed to push employee-record notify', err),
      );

    // Имейл (best-effort)
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: entity.userId },
        select: { email: true, firstName: true },
      });
      if (user?.email) {
        await this.mail.send({
          to: user.email,
          subject: 'Нов документ в трудовото ви досие',
          html: `<p>Здравейте${user.firstName ? `, ${user.firstName}` : ''},</p><p>В трудовото ви досие е добавен ${label}. Моля, влезте в CortanaSoft (раздел „Моето досие"), прегледайте документа и потвърдете получаването му.</p><p>(изпратено автоматично от CortanaSoft)</p>`,
        });
      }
    } catch (err) {
      this.logger.error('Failed to email employee-record notify', err as Error);
    }

    await this.audit.log(companyId, {
      action: 'NOTIFY',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: entity.userId,
      entityType,
      entityId: id,
      detail: label,
    });

    return updated;
  }

  /**
   * Потвърждаване на получаване. Когато го прави служителят (Моето досие),
   * ownership се проверява; HR може да отбележи ръчно (напр. хартиено връчване).
   */
  async confirmDelivery(
    companyId: string,
    entityType: string,
    id: string,
    actor: { id: string; email?: string },
    opts: { employeeOnly?: boolean } = {},
  ) {
    const model = this.model(entityType);
    const entity = await this.load(model, companyId, id);

    if (opts.employeeOnly && entity.userId !== actor.id) {
      throw new ForbiddenException('Можете да потвърждавате само свои документи');
    }

    const updated = await (this.prisma[model] as any).update({
      where: { id },
      data: {
        deliveryConfirmedAt: new Date(),
        deliveryConfirmedById: actor.id,
      },
    });

    await this.audit.log(companyId, {
      action: 'CONFIRM_DELIVERY',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: entity.userId,
      entityType,
      entityId: id,
      detail:
        entity.userId === actor.id
          ? 'Потвърдено от служителя'
          : 'Отбелязано ръчно от HR',
    });

    return updated;
  }
}
