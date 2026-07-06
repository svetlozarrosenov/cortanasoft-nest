import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * For legacy controllers that derive the tenant from the JWT (the user's
 * currently active company) instead of a `:companyId` URL param. Populates
 * `request.companyId` so PermissionsGuard can enforce role permissions on
 * these routes just like it does on the company-scoped controllers.
 */
@Injectable()
export class JwtCompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.currentCompany?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    request.companyId = user.currentCompany.id;
    return true;
  }
}
