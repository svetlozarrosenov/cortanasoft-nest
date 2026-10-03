-- Доставки: статус „В транзит" между „Очаквана" и „Доставена" (само информация,
-- наличността влиза при „Доставена" както досега).
ALTER TYPE "GoodsReceiptStatus" ADD VALUE 'IN_TRANSIT' BEFORE 'DELIVERED';
