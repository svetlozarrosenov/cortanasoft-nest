import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class CompanyAccessGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
