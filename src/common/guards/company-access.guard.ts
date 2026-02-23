import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class CompanyAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.params.companyId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    // Check if user has access to this company
    const hasAccess = user.companies?.some(
      (c: { id: string }) => c.id === companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Access denied. You do not have access to this company.',
      );
    }

    // Set companyId on request for controllers to use
    request.companyId = companyId;

    return true;
  }
}
