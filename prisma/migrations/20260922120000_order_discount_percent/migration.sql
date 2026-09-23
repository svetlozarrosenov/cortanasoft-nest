-- Отстъпка на документа в % (NULL = въведена като сума)
ALTER TABLE "orders" ADD COLUMN "discountPercent" DECIMAL(5,2);
