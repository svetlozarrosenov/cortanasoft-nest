-- AlterTable
ALTER TABLE "employment_contracts" ADD COLUMN     "expiryNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_companies" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "idCardNumber" TEXT,
ADD COLUMN     "personalAddress" TEXT,
ADD COLUMN     "personalIdEncrypted" TEXT;
