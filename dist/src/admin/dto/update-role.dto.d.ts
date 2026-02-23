import { CreateRoleDto } from './create-role.dto';
declare const UpdateRoleDto_base: import("@nestjs/mapped-types").MappedType<Partial<Omit<CreateRoleDto, "companyId">>>;
export declare class UpdateRoleDto extends UpdateRoleDto_base {
}
export {};
