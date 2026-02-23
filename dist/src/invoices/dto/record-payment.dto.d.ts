import { PaymentMethod } from '@prisma/client';
export declare class RecordPaymentDto {
    amount: number;
    paymentMethod?: PaymentMethod;
}
