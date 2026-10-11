-- A deal's estimated current value (owner, 2026-10-11: a table of
-- "Investment, fund Date, Size, Est Value, Gain / Loss").
--
-- Additive and nullable. No existing row changes, and NULL means unmarked --
-- not zero, and not "carried at cost". The screen renders unmarked positions
-- as "—" and leaves them out of the gain/loss total rather than inventing a
-- valuation nobody entered.
--
-- BigInt for the same reason as every other money column here: a Postgres
-- INTEGER caps at $21,474,836 in cents, and this fund is already at $10M.

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "estValueCents" BIGINT;
