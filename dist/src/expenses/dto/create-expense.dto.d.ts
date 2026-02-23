import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
export declare class CreateExpenseDto {
    description: string;
    category: ExpenseCategory;
    amount: number;
    vatAmount?: number;
    expenseDate?: string;
    dueDate?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
    attachmentUrl?: string;
    status?: ExpenseStatus;
    notes?: string;
    isRecurring?: boolean;
    recurringInterval?: string;
    supplierId?: string;
}
