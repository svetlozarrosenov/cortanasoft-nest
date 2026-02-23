import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Проверяваме дали текущата компания е OWNER (собственик на платформата)
    if (user.currentCompany?.role !== 'OWNER') {
      throw new ForbiddenException(
        'Access denied. Only users from the platform owner company can access this resource.',
      );
    }

    return true;
  }
}
