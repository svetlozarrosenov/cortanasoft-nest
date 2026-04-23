import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

@Injectable()
export class DemoRequestTasksCronService {
  private readonly logger = new Logger(DemoRequestTasksCronService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
  ) {}

  /**
   * Every 5 minutes — push-notify the admin about demo-request tasks whose due date has arrived.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDueTasks() {
    const now = new Date();

    const dueTasks = await this.prisma.demoRequestTask.findMany({
      where: {
        completed: false,
        notifiedAt: null,
        dueDate: { lte: now },
      },
      include: {
        demoRequest: {
          select: { id: true, name: true, companyName: true },
        },
      },
    });

    if (dueTasks.length === 0) return;

    const ownerUser = await this.prisma.userCompany.findFirst({
      where: {
        company: { role: 'OWNER' },
        user: { email: 'svetlozarrosenov@gmail.com' },
      },
      select: { userId: true },
    });

    for (const task of dueTasks) {
      try {
        if (ownerUser) {
          const who = task.demoRequest.companyName || task.demoRequest.name;
          await this.pushService.sendToUser(ownerUser.userId, {
            title: `⏰ Задача: ${task.title}`,
            body: `${who} — крайният срок настъпи`,
            url: `/dashboard/admin/demo-requests?request=${task.demoRequestId}`,
            tag: `demo-task-${task.id}`,
            data: {
              type: 'demo_request_task',
              demoRequestId: task.demoRequestId,
              taskId: task.id,
            },
          });
        }

        await this.prisma.demoRequestTask.update({
          where: { id: task.id },
          data: { notifiedAt: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `Failed to notify demo-request task ${task.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
