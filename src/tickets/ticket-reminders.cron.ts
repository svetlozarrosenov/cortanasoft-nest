import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

@Injectable()
export class TicketRemindersCronService {
  private readonly logger = new Logger(TicketRemindersCronService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
  ) {}

  /**
   * Run every 5 minutes to check for due reminders
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    const now = new Date();

    // Find all reminders that are due and haven't been sent yet
    const dueReminders = await this.prisma.ticketReminder.findMany({
      where: {
        isSent: false,
        remindAt: { lte: now },
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            companyId: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (dueReminders.length === 0) {
      return;
    }

    this.logger.log(`Processing ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      try {
        // Skip if ticket is already done or cancelled
        if (['DONE', 'CANCELLED'].includes(reminder.ticket.status)) {
          // Mark as sent without sending notification
          await this.markReminderProcessed(reminder.id, reminder);
          continue;
        }

        // Check if company has push notifications enabled
        const isCompanyEnabled = await this.pushService.isCompanyEnabled(
          reminder.ticket.companyId,
        );

        if (isCompanyEnabled) {
          // Send push notification
          const title = `Напомняне: ${reminder.ticket.ticketNumber}`;
          const body =
            reminder.message || `Напомняне за задача: ${reminder.ticket.title}`;

          await this.pushService.sendToUser(reminder.userId, {
            title,
            body,
            url: `/dashboard/${reminder.ticket.companyId}/tickets?ticket=${reminder.ticket.id}`,
            tag: `reminder-${reminder.id}`,
            data: {
              type: 'ticket_reminder',
              ticketId: reminder.ticket.id,
              reminderId: reminder.id,
            },
          });

          this.logger.debug(
            `Sent push notification for reminder ${reminder.id} to user ${reminder.userId}`,
          );
        }

        // Mark reminder as processed (handles recurrence)
        await this.markReminderProcessed(reminder.id, reminder);
      } catch (error) {
        this.logger.error(
          `Error processing reminder ${reminder.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Mark reminder as sent and schedule next occurrence if recurring
   */
  private async markReminderProcessed(
    reminderId: string,
    reminder: {
      recurrence: string;
      remindAt: Date;
      intervalDays: number | null;
      recurrenceEnd: Date | null;
      recurrenceCount: number | null;
      sentCount: number;
    },
  ) {
    const now = new Date();
    const newSentCount = reminder.sentCount + 1;

    // Check if this is a recurring reminder that should continue
    if (reminder.recurrence !== 'NONE') {
      // Check if we've reached the recurrence count limit
      if (
        reminder.recurrenceCount &&
        newSentCount >= reminder.recurrenceCount
      ) {
        // Mark as sent and done
        await this.prisma.ticketReminder.update({
          where: { id: reminderId },
          data: {
            isSent: true,
            sentAt: now,
            sentCount: newSentCount,
          },
        });
        return;
      }

      // Calculate next reminder time
      const nextRemindAt = this.calculateNextReminderTime(
        reminder.remindAt,
        reminder.recurrence,
        reminder.intervalDays,
      );

      // Check if next time is past the recurrence end date
      if (reminder.recurrenceEnd && nextRemindAt > reminder.recurrenceEnd) {
        // Mark as sent and done
        await this.prisma.ticketReminder.update({
          where: { id: reminderId },
          data: {
            isSent: true,
            sentAt: now,
            sentCount: newSentCount,
          },
        });
        return;
      }

      // Schedule next occurrence
      await this.prisma.ticketReminder.update({
        where: { id: reminderId },
        data: {
          remindAt: nextRemindAt,
          isSent: false,
          sentAt: now,
          sentCount: newSentCount,
        },
      });
      return;
    }

    // Non-recurring reminder - just mark as sent
    await this.prisma.ticketReminder.update({
      where: { id: reminderId },
      data: {
        isSent: true,
        sentAt: now,
        sentCount: newSentCount,
      },
    });
  }

  /**
   * Calculate next reminder time based on recurrence pattern
   */
  private calculateNextReminderTime(
    currentTime: Date,
    recurrence: string,
    intervalDays?: number | null,
  ): Date {
    const next = new Date(currentTime);

    switch (recurrence) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'CUSTOM':
        if (intervalDays) {
          next.setDate(next.getDate() + intervalDays);
        }
        break;
    }

    return next;
  }

  /**
   * Cleanup old sent reminders (run daily at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldReminders() {
    this.logger.log('Cleaning up old sent reminders...');

    // Delete non-recurring reminders that were sent more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.ticketReminder.deleteMany({
      where: {
        isSent: true,
        recurrence: 'NONE',
        sentAt: { lt: thirtyDaysAgo },
      },
    });

    this.logger.log(`Deleted ${result.count} old reminders`);
  }
}
