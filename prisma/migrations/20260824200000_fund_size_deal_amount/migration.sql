-- Fund size, and a deal's investment size and date (owner, 2026-08-24).
--
-- All three NULLABLE. Fund 1 and the deal already in the table predate them,
-- and this repo may not invent a fund figure — there is a fund size in
-- src/content/fund-allocation.ts, but backfilling from it would mean a
-- migration writing a money figure onto the fund every deal belongs to. They
-- are set from the screen instead.
--
-- ## BIGINT, not INTEGER, and that is the load-bearing part
--
-- A Postgres INTEGER stops at 2,147,483,647. In cents that is $21,474,836.
-- This fund is already at $10M — half the ceiling — so INTEGER would have been
-- a limit the schema imposed on the business, discovered on the write that
-- crossed it. Cents stay exact as a JS number to roughly $90 trillion, so only
-- the column is wide; the API sends Number(...).
--
-- Additive. No existing row changes.


-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "sizeCents" BIGINT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "amountCents" BIGINT,
ADD COLUMN     "investmentDate" DATE;

