-- Add POSTAL_MONEY_TRANSFER (Пощенски паричен превод) as a PaymentMethod option.
-- Different from COD (Наложен платеж — typically with private couriers like Econt/Speedy):
-- POSTAL_MONEY_TRANSFER is the formal Bulgarian Post Office cash-on-delivery service.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'POSTAL_MONEY_TRANSFER';
