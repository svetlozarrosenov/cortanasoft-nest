import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { checkPermission } from '../common/guards/permissions.guard';
import { RolePermissions } from '../common/config/permissions.config';

/**
 * SLA аларми за сервизни заявки: когато обещаният срок (promisedAt) е
 * минал, а заявката още не е готова, техникът (или екипът с право
 * service.orders edit) получава push. `slaNotifiedAt` пази от повторения.
 */
@Injectable()
export class ServiceSlaCronService {
  private readonly logger = new Logger(ServiceSlaCronService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async notifyOverdueOrders() {
    const overdue = await this.prisma.serviceOrder.findMany({
      where: {
        promisedAt: { lt: new Date() },
        slaNotifiedAt: null,
        status: { notIn: ['READY', 'DELIVERED', 'CANCELED'] },
        company: { serviceModuleEnabled: true, pushNotificationsEnabled: true },
      },
      select: {
        id: true,
        orderNumber: true,
        promisedAt: true,
        technicianId: true,
        companyId: true,
        asset: { select: { name: true } },
      },
      take: 200,
    });
    if (!overdue.length) return;

    for (const order of overdue) {
      try {
        const userIds = order.technicianId
          ? [order.technicianId]
          : await this.serviceTeam(order.companyId);
        if (userIds.length) {
          await this.push.sendToUsers(userIds, {
            title: `Просрочена сервизна заявка ${order.orderNumber}`,
            body: `${order.asset?.name ? order.asset.name + ' · ' : ''}обещан срок ${order.promisedAt!.toLocaleDateString('bg-BG')}`,
            url: `/dashboard/${order.companyId}/service/orders/${order.id}`,
            tag: `service-sla-${order.id}`,
          });
        }
        await this.prisma.serviceOrder.update({
          where: { id: order.id },
          data: { slaNotifiedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(
          `Failed SLA notify for order ${order.orderNumber}`,
          err as Error,
        );
      }
    }
    this.logger.log(`SLA notifications sent for ${overdue.length} order(s)`);
  }

  private async serviceTeam(companyId: string): Promise<string[]> {
    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: { role: true },
    });
    return members
      .filter((m) => {
        const perms = m.role?.permissions as unknown as RolePermissions;
        return checkPermission(perms, 'service', 'orders', 'edit');
      })
      .map((m) => m.userId);
  }
}
