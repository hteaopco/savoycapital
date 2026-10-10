-- Two more asset classes (owner, 2026-10-10: "lets add another asset class —
-- Oil & Gas, Real Estate. We have 2 investments coming up in both").
--
-- Purely additive: adding a value to a Postgres enum changes no existing row
-- and invalidates nothing. Every deal already tagged PRIVATE_EQUITY or
-- PRIVATE_CREDIT keeps its value and its place on the chart.
--
-- The warning below is Prisma's own, carried verbatim from
-- `prisma migrate diff` rather than paraphrased. It is a real constraint, not
-- boilerplate: on PostgreSQL 11 and earlier this migration must be split in
-- two. Railway runs 12+, where it applies as written.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "Instrument" ADD VALUE 'OIL_AND_GAS';
ALTER TYPE "Instrument" ADD VALUE 'REAL_ESTATE';
