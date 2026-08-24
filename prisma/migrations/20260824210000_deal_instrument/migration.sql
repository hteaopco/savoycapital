-- A deal's instrument, terms and fees (owner, 2026-08-24: "lets tie the
-- portfolio values to the values in fund and investments").
--
-- `instrument` is what makes the Portfolio's two buckets — the chart groups
-- deals by it. Nullable, like every other column added to these tables: the
-- deals that predate it have none, and a guess would put real money in the
-- wrong slice. The screen names what it cannot plot rather than dropping it.
--
-- `terms` and `fees` are free text, matching the drill-down panel they feed.
-- What a position actually holds is still the decision blocked on a person, and
-- modelling it here to look thorough means the real schema starts by undoing it.
--
-- Additive. No existing row changes.


-- CreateEnum
CREATE TYPE "Instrument" AS ENUM ('PRIVATE_EQUITY', 'PRIVATE_CREDIT');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "fees" TEXT,
ADD COLUMN     "instrument" "Instrument",
ADD COLUMN     "terms" TEXT;

