-- Add IN_TRANSIT to SerialStatus (must be in separate migration/transaction)
ALTER TYPE "SerialStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
