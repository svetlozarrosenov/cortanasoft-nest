-- Manual rank (midpoint float) for Kanban reorder. NULL means no manual order;
-- such tickets fall back to createdAt DESC sort. Index speeds per-company, per-
-- status queries that are the Kanban's read path.
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "rank" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "tickets_companyId_status_rank_idx"
  ON "tickets" ("companyId", "status", "rank");
