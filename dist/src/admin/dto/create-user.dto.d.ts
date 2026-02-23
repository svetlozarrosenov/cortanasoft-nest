declare class UserCompanyAssignment {
    companyId: string;
    roleId: string;
    isDefault?: boolean;
}
export declare class CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive?: boolean;
    companies?: UserCompanyAssignment[];
}
export {};
