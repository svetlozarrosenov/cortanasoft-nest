-- Доставка от ЕС без ДДС (ВОП, самоначисляване)
ALTER TABLE "goods_receipts" ADD COLUMN "reverseChargeVat" BOOLEAN NOT NULL DEFAULT false;
