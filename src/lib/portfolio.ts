import "server-only";
import type { AllocationBucket, DetailRow } from "@/components/FundAllocation";
import { getDb } from "./db";

/**
 * The Portfolio chart, built from the database (owner, 2026-08-24: "lets tie the
 * portfolio values to the values in fund and investments").
 *
 * Until this existed the chart read `src/content/fund-allocation.ts`, so editing
 * a fund's size in Fund & Users changed nothing on Portfolio — which is exactly
 * what the owner reported. There were two sources for the same figure and the
 * screen rendered the one nobody could edit.
 *
 * ## What cannot be plotted is NAMED, not dropped
 *
 * A deal needs both an amount and an instrument to appear: the amount is the
 * arc's length and the instrument is which arc it joins. A deal missing either
 * is returned in `excluded` so the screen can say which, by name. Silently
 * omitting it would make the chart quietly disagree with the Deal Room, and a
 * chart of a fund's money is the last place to hide a row.
 *
 * ## Unallocated is still derived
 *
 * `FundAllocation` computes it as fund size less everything deployed, so this
 * returns buckets only. That has not changed and must not: the figures the chart
 * was first built from arrived $10,000 over, which is why accepting a total as
 * an input was rejected in the first place.
 *
 * ## Two failures, told apart
 *
 * "No database" and "no such fund" are different problems with different fixes —
 * a variable to set versus a fund to create — and a fresh deploy hits the second
 * one, because a management viewer with no assignment falls back to fund 1 and
 * an empty database has no fund 1. Returning one `null` for both would print
 * "the database is not configured" on a database that is working fine.
 */

export type PortfolioData = {
  fundName: string;
  fundSizeCents: number | null;
  buckets: AllocationBucket[];
  /** Deals that could not be plotted, and why. */
  excluded: { name: string; missing: string }[];
};

export type PortfolioResult =
  /** No `DATABASE_URL`. A deploy problem. */
  | { kind: "no-database" }
  /** The database answered; there is no fund with that id. */
  | { kind: "no-fund"; fundId: number }
  | { kind: "ok"; data: PortfolioData };

/**
 * Bucket identity per instrument.
 *
 * The tones match what the chart has always shown — equity accent, credit green
 * — and they are ARC IDENTITY, not state. `ui-governance.md` § 3 carves the
 * donut out of the badge rule for exactly this reason: a chart is a vocabulary
 * the design system has no words for.
 */
const BUCKETS = {
  PRIVATE_EQUITY: { id: "equity", label: "Private Equity", tone: "accent" as const },
  PRIVATE_CREDIT: { id: "credit", label: "Private Credit", tone: "green" as const },
};

export async function loadPortfolio(fundId: number): Promise<PortfolioResult> {
  const db = getDb();
  if (!db) return { kind: "no-database" };

  const fund = await db.fund.findUnique({
    where: { id: fundId },
    include: { deals: { orderBy: { id: "asc" } } },
  });
  if (!fund) return { kind: "no-fund", fundId };

  const excluded: PortfolioData["excluded"] = [];
  const byInstrument = new Map<keyof typeof BUCKETS, AllocationBucket>();

  for (const deal of fund.deals) {
    const missing: string[] = [];
    if (deal.amountCents === null) missing.push("investment size");
    if (deal.instrument === null) missing.push("instrument");
    if (missing.length > 0) {
      excluded.push({ name: deal.name, missing: missing.join(" and ") });
      continue;
    }

    const key = deal.instrument as keyof typeof BUCKETS;
    const meta = BUCKETS[key];
    if (!meta) {
      // An instrument the chart has no bucket for. Reachable only by adding an
      // enum value without adding a bucket, and named rather than dropped so
      // that omission is visible on the screen instead of in a diff.
      excluded.push({ name: deal.name, missing: `an unmapped instrument (${deal.instrument})` });
      continue;
    }

    if (!byInstrument.has(key)) {
      byInstrument.set(key, { id: meta.id, label: meta.label, tone: meta.tone, holdings: [] });
    }

    /*
      The drill-down rows, built only from what is actually set. An empty row
      would print a label with nothing beside it, which reads as missing data
      rather than as data nobody recorded.
    */
    const detail = [
      deal.investmentDate
        ? { label: "Date funded", value: deal.investmentDate.toISOString().slice(0, 10) }
        : null,
      { label: "Instrument", value: meta.label },
      deal.terms ? { label: "Terms", value: deal.terms } : null,
      deal.fees ? { label: "Fees", value: deal.fees } : null,
    ].filter((r): r is DetailRow => r !== null);

    byInstrument.get(key)!.holdings.push({
      name: deal.name,
      /*
        Passed alongside the detail rows, not inside them (owner, 2026-08-24:
        "i would like tfor the 'why we like it' to be off the card to the right
        ... the why we like it box after that"). It is its own panel further
        down the chain, so the component decides where it goes; this only
        supplies it.

        **Investor-visible.** It reaches this surface, which is what an investor
        reads — `DECISIONS.md` records that as a decision the owner made and
        reversed once, not a default.
      */
      whyWeLikeIt: deal.whyWeLikeIt,
      // BigInt does not cross the server boundary; cents stay exact as a Number
      // to about $90 trillion, so the width lives in the column.
      amountCents: Number(deal.amountCents),
      detail,
    });
  }

  return {
    kind: "ok",
    data: {
      fundName: fund.name,
      fundSizeCents: fund.sizeCents === null ? null : Number(fund.sizeCents),
      // Equity before credit, so the chart's arc order does not depend on which
      // deal happened to be created first.
      buckets: (["PRIVATE_EQUITY", "PRIVATE_CREDIT"] as const)
        .map((k) => byInstrument.get(k))
        .filter((b): b is AllocationBucket => b !== undefined),
      excluded,
    },
  };
}
