-- Optional grouping for a deal's documents (owner, 2026-08-24).
--
-- Nullable and with no default: NULL means "top level of the deal", which is
-- what every row that already exists should be, and is what they get for free.
-- Adding a NULLable column with no default is a metadata-only change in
-- Postgres, so this does not rewrite the table.
ALTER TABLE "DealDocument" ADD COLUMN "folder" TEXT;

-- CreateIndex
CREATE INDEX "DealDocument_dealId_folder_idx" ON "DealDocument"("dealId", "folder");
