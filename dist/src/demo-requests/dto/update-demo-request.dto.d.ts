import { DemoRequestStatus } from '@prisma/client';
export declare class UpdateDemoRequestDto {
    status?: DemoRequestStatus;
    notes?: string;
    contactedAt?: string;
    scheduledAt?: string;
    completedAt?: string;
}
