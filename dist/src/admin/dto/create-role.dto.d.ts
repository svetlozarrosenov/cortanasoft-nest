import type { RolePermissions } from '../../common/config/permissions.config';
export declare class CreateRoleDto {
    name: string;
    description?: string;
    permissions?: RolePermissions;
    isDefault?: boolean;
    companyId: string;
}
