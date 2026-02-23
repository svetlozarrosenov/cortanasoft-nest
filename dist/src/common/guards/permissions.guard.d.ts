import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RolePermissions } from '../config/permissions.config';
export declare const PERMISSIONS_KEY = "permissions";
export interface PermissionRequirement {
    module: string;
    page: string;
    action: 'view' | 'create' | 'edit' | 'delete';
}
export declare const RequirePermissions: (...permissions: PermissionRequirement[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireView: (module: string, page: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireCreate: (module: string, page: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireEdit: (module: string, page: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireDelete: (module: string, page: string) => import("@nestjs/common").CustomDecorator<string>;
export declare class PermissionsGuard implements CanActivate {
    private reflector;
    private prisma;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private hasPermission;
}
export declare function checkPermission(permissions: RolePermissions, module: string, page: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean;
export declare function getVisibleColumns(permissions: RolePermissions, module: string, page: string, table: string): string[] | null;
