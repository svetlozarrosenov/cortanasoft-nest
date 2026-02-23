"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TicketRemindersCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketRemindersCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const push_notifications_service_1 = require("../push-notifications/push-notifications.service");
let TicketRemindersCronService = TicketRemindersCronService_1 = class TicketRemindersCronService {
    prisma;
    pushService;
    logger = new common_1.Logger(TicketRemindersCronService_1.name);
    constructor(prisma, pushService) {
        this.prisma = prisma;
        this.pushService = pushService;
    }
    async processReminders() {
        const now = new Date();
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
                if (['DONE', 'CANCELLED'].includes(reminder.ticket.status)) {
                    await this.markReminderProcessed(reminder.id, reminder);
                    continue;
                }
                const isCompanyEnabled = await this.pushService.isCompanyEnabled(reminder.ticket.companyId);
                if (isCompanyEnabled) {
                    const title = `Напомняне: ${reminder.ticket.ticketNumber}`;
                    const body = reminder.message || `Напомняне за задача: ${reminder.ticket.title}`;
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
                    this.logger.debug(`Sent push notification for reminder ${reminder.id} to user ${reminder.userId}`);
                }
                await this.markReminderProcessed(reminder.id, reminder);
            }
            catch (error) {
                this.logger.error(`Error processing reminder ${reminder.id}: ${error.message}`, error.stack);
            }
        }
    }
    async markReminderProcessed(reminderId, reminder) {
        const now = new Date();
        const newSentCount = reminder.sentCount + 1;
        if (reminder.recurrence !== 'NONE') {
            if (reminder.recurrenceCount &&
                newSentCount >= reminder.recurrenceCount) {
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
            const nextRemindAt = this.calculateNextReminderTime(reminder.remindAt, reminder.recurrence, reminder.intervalDays);
            if (reminder.recurrenceEnd && nextRemindAt > reminder.recurrenceEnd) {
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
        await this.prisma.ticketReminder.update({
            where: { id: reminderId },
            data: {
                isSent: true,
                sentAt: now,
                sentCount: newSentCount,
            },
        });
    }
    calculateNextReminderTime(currentTime, recurrence, intervalDays) {
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
    async cleanupOldReminders() {
        this.logger.log('Cleaning up old sent reminders...');
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
};
exports.TicketRemindersCronService = TicketRemindersCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TicketRemindersCronService.prototype, "processReminders", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TicketRemindersCronService.prototype, "cleanupOldReminders", null);
exports.TicketRemindersCronService = TicketRemindersCronService = TicketRemindersCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        push_notifications_service_1.PushNotificationsService])
], TicketRemindersCronService);
//# sourceMappingURL=ticket-reminders.cron.js.map