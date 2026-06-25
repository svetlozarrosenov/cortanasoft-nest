import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

/**
 * Single cron that push-notifies the admin about due follow-up tasks across
 * BOTH lead inboxes — demo requests and contact submissions. One tick, one
 * recipient lookup, both task tables.
 */
@Injectable()
export class LeadTaskRemindersCronService {
  private readonly logger = new Logger(LeadTaskRemindersCronService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
  ) {}

  /**
   * Every 5 minutes — notify about demo-request and contact-submission tasks
   * whose due date has arrived.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDueTasks() {
    const now = new Date();

    const [demoTasks, contactTasks] = await Promise.all([
      this.prisma.demoRequestTask.findMany({
        where: { completed: false, notifiedAt: null, dueDate: { lte: now } },
        include: {
          demoRequest: { select: { id: true, name: true, companyName: true } },
        },
      }),
      this.prisma.contactSubmissionTask.findMany({
        where: { completed: false, notifiedAt: null, dueDate: { lte: now } },
        include: {
          contactSubmission: { select: { id: true, name: true, company: true } },
        },
      }),
    ]);

    if (demoTasks.length === 0 && contactTasks.length === 0) return;

    // Recipient: the founder/owner account only.
    const ownerUser = await this.prisma.userCompany.findFirst({
      where: {
        company: { role: 'OWNER' },
        user: { email: 'svetlozarrosenov@gmail.com' },
      },
      select: { userId: true },
    });

    for (const task of demoTasks) {
      const who = task.demoRequest.companyName || task.demoRequest.name;
      await this.notify({
        userId: ownerUser?.userId,
        title: `⏰ Задача: ${task.title}`,
        body: `${who} — крайният срок настъпи`,
        url: `/dashboard/admin/demo-requests?request=${task.demoRequestId}`,
        tag: `demo-task-${task.id}`,
        data: {
          type: 'demo_request_task',
          demoRequestId: task.demoRequestId,
          taskId: task.id,
        },
        markNotified: () =>
          this.prisma.demoRequestTask.update({
            where: { id: task.id },
            data: { notifiedAt: new Date() },
          }),
        taskId: task.id,
      });
    }

    for (const task of contactTasks) {
      const who = task.contactSubmission.company || task.contactSubmission.name;
      await this.notify({
        userId: ownerUser?.userId,
        title: `⏰ Задача: ${task.title}`,
        body: `${who} — крайният срок настъпи`,
        url: `/dashboard/admin/contact-submissions?submission=${task.contactSubmissionId}`,
        tag: `contact-task-${task.id}`,
        data: {
          type: 'contact_submission_task',
          contactSubmissionId: task.contactSubmissionId,
          taskId: task.id,
        },
        markNotified: () =>
          this.prisma.contactSubmissionTask.update({
            where: { id: task.id },
            data: { notifiedAt: new Date() },
          }),
        taskId: task.id,
      });
    }
  }

  private async notify(args: {
    userId?: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    data: Record<string, string>;
    markNotified: () => Promise<unknown>;
    taskId: string;
  }) {
    try {
      if (args.userId) {
        await this.pushService.sendToUser(args.userId, {
          title: args.title,
          body: args.body,
          url: args.url,
          tag: args.tag,
          data: args.data,
        });
      }
      // Always stamp notifiedAt so we don't re-process this task next tick,
      // even when there is no owner subscription to push to.
      await args.markNotified();
    } catch (error) {
      this.logger.error(
        `Failed to notify lead task ${args.taskId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
