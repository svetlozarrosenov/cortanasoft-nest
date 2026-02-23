import { LocationType } from '@prisma/client';
export declare class CreateLocationDto {
    name: string;
    code: string;
    type?: LocationType;
    address?: string;
    description?: string;
    isDefault?: boolean;
    isActive?: boolean;
}
