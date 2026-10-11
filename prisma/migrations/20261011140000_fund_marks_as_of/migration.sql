-- The date a fund's estimated values are marked as of (owner, 2026-10-11:
-- "the entire table will be updated all at once, never one at a time").
--
-- One date per FUND, because that is the owner's description of the process:
-- the marks are refreshed in a batch, so a per-deal date would be N copies of
-- one fact and N chances for them to disagree.
--
-- Additive and nullable. **Deliberately NOT backfilled with the "2026-08-23"
-- that the deleted FUND_AS_OF literal carried.** Every estValueCents is still
-- NULL, so writing that date would claim marks were struck in August that
-- nobody has entered — the exact kind of confidently-wrong figure the nullable
-- column exists to avoid. It reads as undated until a person sets it.

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "marksAsOf" DATE;
