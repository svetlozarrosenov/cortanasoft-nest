import { IsString } from 'class-validator';

export class AssignCustomerDto {
  @IsString()
  customerId: string;
}
