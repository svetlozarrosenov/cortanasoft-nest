import { CreateDealDto } from './create-deal.dto';
declare const UpdateDealDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateDealDto>>;
export declare class UpdateDealDto extends UpdateDealDto_base {
    isActive?: boolean;
    actualCloseDate?: string;
    lostReason?: string;
}
export {};
