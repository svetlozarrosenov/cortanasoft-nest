import { PayrollPaymentType, PayrollStatus } from '@prisma/client';
export declare class UpdatePayrollItemDto {
    id?: string;
    type: PayrollPaymentType;
    description: string;
    amount: number;
}
export declare class UpdatePayrollDto {
    baseSalary?: number;
    overtimePay?: number;
    bonuses?: number;
    allowances?: number;
    commissions?: number;
    taxDeductions?: number;
    insuranceEmployee?: number;
    insuranceEmployer?: number;
    otherDeductions?: number;
    workingDays?: number;
    workedDays?: number;
    sickLeaveDays?: number;
    vacationDays?: number;
    unpaidLeaveDays?: number;
    status?: PayrollStatus;
    notes?: string;
    items?: UpdatePayrollItemDto[];
}
