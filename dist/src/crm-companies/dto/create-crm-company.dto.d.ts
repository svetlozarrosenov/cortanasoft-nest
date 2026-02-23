export declare enum CrmCompanyType {
    PROSPECT = "PROSPECT",
    CUSTOMER = "CUSTOMER",
    PARTNER = "PARTNER",
    VENDOR = "VENDOR",
    COMPETITOR = "COMPETITOR",
    OTHER = "OTHER"
}
export declare enum CompanySize {
    MICRO = "MICRO",
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}
export declare enum Industry {
    TECHNOLOGY = "TECHNOLOGY",
    FINANCE = "FINANCE",
    HEALTHCARE = "HEALTHCARE",
    MANUFACTURING = "MANUFACTURING",
    RETAIL = "RETAIL",
    REAL_ESTATE = "REAL_ESTATE",
    EDUCATION = "EDUCATION",
    CONSULTING = "CONSULTING",
    LOGISTICS = "LOGISTICS",
    HOSPITALITY = "HOSPITALITY",
    CONSTRUCTION = "CONSTRUCTION",
    AGRICULTURE = "AGRICULTURE",
    ENERGY = "ENERGY",
    MEDIA = "MEDIA",
    OTHER = "OTHER"
}
export declare class CreateCrmCompanyDto {
    name: string;
    type?: CrmCompanyType;
    industry?: Industry;
    size?: CompanySize;
    eik?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    countryId?: string;
    annualRevenue?: number;
    employeeCount?: number;
    foundedYear?: number;
    linkedIn?: string;
    facebook?: string;
    twitter?: string;
    description?: string;
    notes?: string;
    tags?: string;
    isActive?: boolean;
}
