-- Кога е анулиран разходът: анулиран разход може да се възстанови само до
-- края на месеца на анулирането.
ALTER TABLE "expenses" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- За вече анулираните датата не е пазена — приблизително: последната промяна.
UPDATE "expenses" SET "cancelledAt" = "updatedAt" WHERE "status" = 'CANCELLED';
