-- Начин на плащане на разход (null = неизвестен за съществуващите записи)
ALTER TABLE "expenses" ADD COLUMN "paymentMethod" "PaymentMethod";
