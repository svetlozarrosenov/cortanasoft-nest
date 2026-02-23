declare const UpdateLeadDto_base: import("@nestjs/mapped-types").MappedType<any>;
export declare class UpdateLeadDto extends UpdateLeadDto_base {
    isActive?: boolean;
    convertedAt?: string;
    convertedToCustomerId?: string;
    convertedToCrmCompanyId?: string;
}
export {};
