import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
export declare class TicketRemindersCronService {
    private prisma;
    private pushService;
    private readonly logger;
    constructor(prisma: PrismaService, pushService: PushNotificationsService);
    processReminders(): Promise<void>;
    private markReminderProcessed;
    private calculateNextReminderTime;
    cleanupOldReminders(): Promise<void>;
}
