import { CrmCompanyType, CompanySize, Industry } from './create-crm-company.dto';
export declare class QueryCrmCompaniesDto {
    search?: string;
    type?: CrmCompanyType;
    industry?: Industry;
    size?: CompanySize;
    isActive?: boolean;
    city?: string;
    countryId?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
