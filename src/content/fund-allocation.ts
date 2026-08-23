import type { AllocationBucket } from "@/components/FundAllocation";

/**
 * The fund's committed capital and what it is deployed into (owner, 2026-08-23).
 *
 * Money is integer cents, per FACTS.md. Read the figures below as cents:
 * 1_000_000_000 is $10,000,000.
 *
 * **Do not add an "Unallocated" bucket here.** `FundAllocation` derives it as
 * the fund size less everything in `FUND_BUCKETS`, so the chart cannot show a
 * split that fails to add up to the fund. Recording that as a comment because
 * the figures this was built from arrived $10,000 over and the temptation is to
 * key the remainder in by hand.
 */
export const FUND_SIZE_CENTS = 1_000_000_000;

/** Date of the marks shown, ISO `YYYY-MM-DD`. */
export const FUND_AS_OF = "2026-08-23";

export const FUND_BUCKETS: AllocationBucket[] = [
  {
    id: "equity",
    label: "Private Equity",
    tone: "accent",
    holdings: [
      { name: "Westfield Companies", amountCents: 250_000_000 },
      { name: "Marucci Sports", amountCents: 250_000_000 },
    ],
  },
  {
    id: "credit",
    label: "Private Credit",
    tone: "green",
    holdings: [{ name: "HTea Opco", amountCents: 101_000_000 }],
  },
];
