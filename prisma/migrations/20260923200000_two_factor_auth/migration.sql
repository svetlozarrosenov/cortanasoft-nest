-- Двуфакторна автентикация (TOTP): режим на потребителя + шифрован ключ,
-- запомнени устройства (30 дни) и незавършени входове, чакащи код.
CREATE TYPE "TwoFactorMode" AS ENUM ('NOT_REQUIRED', 'NOT_SETUP', 'REQUIRED');
CREATE TYPE "TwoFactorPurpose" AS ENUM ('SETUP', 'LOGIN');

ALTER TABLE "users"
  ADD COLUMN "twoFactorMode" "TwoFactorMode" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);

CREATE TABLE "trusted_devices" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trusted_devices_tokenHash_key" ON "trusted_devices"("tokenHash");
CREATE INDEX "trusted_devices_userId_idx" ON "trusted_devices"("userId");
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "two_factor_challenges" (
  "id" TEXT NOT NULL,
  "purpose" "TwoFactorPurpose" NOT NULL,
  "pendingSecret" TEXT,
  "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  "acceptTerms" BOOLEAN NOT NULL DEFAULT false,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "two_factor_challenges_userId_idx" ON "two_factor_challenges"("userId");
ALTER TABLE "two_factor_challenges" ADD CONSTRAINT "two_factor_challenges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
