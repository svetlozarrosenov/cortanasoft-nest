export interface ColumnPermission {
    key: string;
    labelKey: string;
}
export interface TablePermission {
    key: string;
    labelKey: string;
    columns: ColumnPermission[];
}
export interface PagePermission {
    key: string;
    labelKey: string;
    actions: string[];
    tables?: TablePermission[];
}
export interface ModulePermission {
    key: string;
    labelKey: string;
    icon: string;
    pages: PagePermission[];
}
export interface RolePermissions {
    modules: {
        [moduleKey: string]: {
            enabled: boolean;
            pages: {
                [pageKey: string]: {
                    enabled: boolean;
                    actions: {
                        view: boolean;
                        create: boolean;
                        edit: boolean;
                        delete: boolean;
                    };
                    tables?: {
                        [tableKey: string]: {
                            enabled: boolean;
                            columns: string[];
                        };
                    };
                };
            };
        };
    };
}
export declare const PERMISSIONS_CONFIG: ModulePermission[];
export declare function createEmptyPermissions(): RolePermissions;
export declare function createFullPermissions(): RolePermissions;
export declare function stripAdminModuleFromPermissions(permissions: RolePermissions): RolePermissions;
