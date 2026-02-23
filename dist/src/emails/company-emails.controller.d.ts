import { EmailsService } from './emails.service';
import { CreateEmailDto, UpdateEmailDto, QueryEmailsDto } from './dto';
export declare class CompanyEmailsController {
    private readonly emailsService;
    constructor(emailsService: EmailsService);
    create(companyId: string, req: {
        user: {
            id: string;
        };
    }, createEmailDto: CreateEmailDto): Promise<any>;
    findAll(companyId: string, query: QueryEmailsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
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
    getScheduledEmails(companyId: string, req: {
        user: {
            id: string;
        };
    }, limit?: string, allUsers?: string): Promise<any>;
    getThread(companyId: string, threadId: string): Promise<any>;
    findOne(companyId: string, id: string): Promise<any>;
    update(companyId: string, id: string, updateEmailDto: UpdateEmailDto): Promise<any>;
    send(companyId: string, id: string): Promise<any>;
    markAsRead(companyId: string, id: string): Promise<any>;
    archive(companyId: string, id: string): Promise<any>;
    remove(companyId: string, id: string): Promise<any>;
}
