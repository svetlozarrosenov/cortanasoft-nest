import { DealStatus } from '@prisma/client';
export declare class CreateDealDto {
    name: string;
    description?: string;
    amount?: number;
    currencyId?: string;
    status?: DealStatus;
    probability?: number;
    expectedCloseDate?: string;
    customerId?: string;
    assignedToId?: string;
    source?: string;
    notes?: string;
}
