-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('MANAGEMENT', 'INVESTOR');

-- CreateTable
CREATE TABLE "Fund" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" SERIAL NOT NULL,
    "fundId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDocument" (
    "id" SERIAL NOT NULL,
    "dealId" INTEGER NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'MANAGEMENT',
    "key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_fundId_createdAt_idx" ON "Deal"("fundId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DealDocument_key_key" ON "DealDocument"("key");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_audience_idx" ON "DealDocument"("dealId", "audience");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the one fund that exists today.
--
--   > "every deal id right now = fundid 1" — owner, 2026-08-24
--
-- Named from FACTS.md's own first line rather than invented: the fund IS Savoy
-- Capital. Rename it in the UI when there is a second one to tell apart.
INSERT INTO "Fund" ("id", "name") VALUES (1, 'Savoy Capital')
    ON CONFLICT ("id") DO NOTHING;

-- Inserting an explicit id into a SERIAL column does NOT advance its sequence,
-- so without this the first fund created through the app would try to reuse id
-- 1 and fail the primary key. Bug-by-construction otherwise; not theoretical.
SELECT setval(
    pg_get_serial_sequence('"Fund"', 'id'),
    GREATEST((SELECT MAX("id") FROM "Fund"), 1)
);
