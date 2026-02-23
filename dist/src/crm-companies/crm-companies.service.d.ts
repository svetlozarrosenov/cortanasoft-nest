import { PrismaService } from '../prisma/prisma.service';
import { CreateCrmCompanyDto, UpdateCrmCompanyDto, QueryCrmCompaniesDto } from './dto';
export declare class CrmCompaniesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateCrmCompanyDto): Promise<any>;
    findAll(companyId: string, query: QueryCrmCompaniesDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<any>;
    update(companyId: string, id: string, dto: UpdateCrmCompanyDto): Promise<any>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
    getIndustries(): Promise<string[]>;
    getTypes(): Promise<string[]>;
    getSizes(): Promise<string[]>;
}
