import { PayrollPaymentType } from '@prisma/client';
export declare class CreatePayrollItemDto {
    type: PayrollPaymentType;
    description: string;
    amount: number;
}
export declare class CreatePayrollDto {
    userId: string;
    year: number;
    month: number;
    baseSalary: number;
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
    notes?: string;
    items?: CreatePayrollItemDto[];
}
