import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RolePermissions } from '../config/permissions.config';
import { ErrorMessages } from '../constants/error-messages';

// Metadata key for permissions
export const PERMISSIONS_KEY = 'permissions';

// Permission requirement interface
export interface PermissionRequirement {
  module: string;
  page: string;
  action: 'view' | 'create' | 'edit' | 'delete';
}

// Decorator to set required permissions on a route
export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Shorthand decorators for common operations
export const RequireView = (module: string, page: string) =>
  RequirePermissions({ module, page, action: 'view' });

export const RequireCreate = (module: string, page: string) =>
  RequirePermissions({ module, page, action: 'create' });

export const RequireEdit = (module: string, page: string) =>
  RequirePermissions({ module, page, action: 'edit' });

export const RequireDelete = (module: string, page: string) =>
  RequirePermissions({ module, page, action: 'delete' });

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionRequirement[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.companyId || request.companyId;

    if (!user) {
      throw new ForbiddenException(ErrorMessages.common.userNotAuthenticated);
    }

    // Super admins (OWNER company role) have full access
    // Check if user is owner of any company they belong to
    const ownerCompany = user.companies?.find(
      (c: { id: string; role: string }) =>
        c.id === companyId && c.role === 'OWNER',
    );
    if (ownerCompany) {
      return true;
    }

    // Get user's role for this company
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: companyId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!userCompany || !userCompany.role) {
      throw new ForbiddenException(ErrorMessages.common.noRoleAssigned);
    }

    const permissions = userCompany.role
      .permissions as unknown as RolePermissions;

    // Check all required permissions
    for (const required of requiredPermissions) {
      if (!this.hasPermission(permissions, required)) {
        throw new ForbiddenException(
          ErrorMessages.common.missingPermission(
            `${required.module}.${required.page}.${required.action}`,
          ),
        );
      }
    }

    return true;
  }

  private hasPermission(
    permissions: RolePermissions,
    required: PermissionRequirement,
  ): boolean {
    if (!permissions?.modules) {
      return false;
    }

    const module = permissions.modules[required.module];
    if (!module?.enabled) {
      return false;
    }

    const page = module.pages?.[required.page];
    if (!page?.enabled) {
      return false;
    }

    return page.actions?.[required.action] || false;
  }
}

// Helper function to check permissions programmatically (for services)
export function checkPermission(
  permissions: RolePermissions,
  module: string,
  page: string,
  action: 'view' | 'create' | 'edit' | 'delete',
): boolean {
  if (!permissions?.modules) {
    return false;
  }

  const moduleConfig = permissions.modules[module];
  if (!moduleConfig?.enabled) {
    return false;
  }

  const pageConfig = moduleConfig.pages?.[page];
  if (!pageConfig?.enabled) {
    return false;
  }

  return pageConfig.actions?.[action] || false;
}

// Helper to get visible columns for a table
export function getVisibleColumns(
  permissions: RolePermissions,
  module: string,
  page: string,
  table: string,
): string[] | null {
  if (!permissions?.modules) {
    return null; // null means all columns visible (no restrictions)
  }

  const moduleConfig = permissions.modules[module];
  if (!moduleConfig?.enabled) {
    return [];
  }

  const pageConfig = moduleConfig.pages?.[page];
  if (!pageConfig?.enabled) {
    return [];
  }

  const tableConfig = pageConfig.tables?.[table];
  if (!tableConfig?.enabled) {
    return null; // No table config means all columns visible
  }

  return tableConfig.columns || [];
}
