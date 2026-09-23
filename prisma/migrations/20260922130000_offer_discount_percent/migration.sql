-- Отстъпка на документа в % за офертите (NULL = въведена като сума)
ALTER TABLE "offers" ADD COLUMN "discountPercent" DECIMAL(5,2);
