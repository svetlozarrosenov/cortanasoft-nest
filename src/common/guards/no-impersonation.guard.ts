import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ErrorMessages } from '../constants/error-messages';

/**
 * Спира чувствителните действия (парола, смяна на фирма, …) в сесия
 * „Влез като" — админът гледа и помага, не променя самоличността на човека.
 */
@Injectable()
export class NoImpersonationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as
      | { impersonatedBy?: string | null }
      | undefined;
    if (user?.impersonatedBy) {
      throw new ForbiddenException(ErrorMessages.impersonation.notAllowed);
    }
    return true;
  }
}
