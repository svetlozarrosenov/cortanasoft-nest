import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailDto, UpdateEmailDto, QueryEmailsDto } from './dto';
export declare class EmailsService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly emailInclude;
    create(companyId: string, userId: string, dto: CreateEmailDto): Promise<any>;
    findAll(companyId: string, query: QueryEmailsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(companyId: string, id: string): Promise<any>;
    update(companyId: string, id: string, dto: UpdateEmailDto): Promise<any>;
    remove(companyId: string, id: string): Promise<any>;
    send(companyId: string, id: string): Promise<any>;
    markAsRead(companyId: string, id: string): Promise<any>;
    archive(companyId: string, id: string): Promise<any>;
    getDirections(): Promise<unknown[]>;
    getStatuses(): Promise<unknown[]>;
    getPriorities(): Promise<unknown[]>;
    getStatistics(companyId: string): Promise<{
        totalEmails: any;
        todayEmails: any;
        weekEmails: any;
        draftEmails: any;
        sentEmails: any;
        scheduledEmails: any;
        byDirection: any;
        byStatus: any;
        byPriority: any;
    }>;
    getScheduledEmails(companyId: string, userId?: string, limit?: number): Promise<any>;
    getThread(companyId: string, threadId: string): Promise<any>;
}
