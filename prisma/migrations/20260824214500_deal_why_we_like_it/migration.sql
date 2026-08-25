-- The deal's investment thesis (owner, 2026-08-24: "lets add a 'Why We Like It'
-- modal to the right of the deal info card").
--
-- Nullable and additive, like every other column added to this table. No
-- existing row changes and nothing is backfilled — a thesis is written, not
-- derived, and this repo may not invent one.
--
-- TEXT rather than VARCHAR(2000): the 2,000-character limit is a product rule
-- about what fits the panel, enforced at the route where it can return a
-- message, not a storage rule worth a migration to change.

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "whyWeLikeIt" TEXT;
