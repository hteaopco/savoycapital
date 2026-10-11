import "server-only";
import type { AllocationBucket, DetailRow } from "@/components/FundAllocation";
import { getDb } from "./db";
import type { $Enums } from "@prisma/client";

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

/**
 * One line of the investments table (owner, 2026-10-11).
 *
 * `estValueCents` null means UNMARKED. Not zero, and deliberately not carried
 * at cost — see `Deal.estValueCents`. `gainLossCents` is therefore null too
 * whenever either side of the subtraction is missing, rather than quietly
 * reading a missing value as no change.
 */
export type InvestmentRow = {
  name: string;
  /** `YYYY-MM-DD`, or null for a deal nobody has dated. */
  fundedOn: string | null;
  sizeCents: number | null;
  estValueCents: number | null;
  gainLossCents: number | null;
};

/**
 * The table's footer. Sums, and an honest account of what they cover.
 *
 * **The invariant: each cell is the sum of the numbers VISIBLE in its own
 * column, and nothing else.** A reader checks a total by adding the column, so
 * a footer figure that includes or excludes a row they can see is a figure that
 * fails that check. `sizeCents` sums every stated size; `estValueCents` every
 * stated value; `gainLossCents` every row where both sides were known.
 *
 * Each is therefore covered by a DIFFERENT subset, and the three can disagree
 * about how many rows they counted. That is not a defect to normalise away:
 * `null` means unmarked, a value nobody entered, and the alternatives are to
 * treat an unmarked position as worth nothing (a wrong number stated
 * confidently) or to carry it at cost (asserting a mark nobody made). So the
 * sums cover what they cover and `markedCount` / `rowCount` ride along for the
 * screen to print the ratio.
 *
 * `markedCount` is specifically **how many have an Est Value**. Gain / Loss can
 * cover fewer — a valued deal with no size has no gain to compute — and that
 * deal is already named by `excluded`, which the page prints above this table.
 */
export type InvestmentTotals = {
  sizeCents: number;
  estValueCents: number | null;
  gainLossCents: number | null;
  rowCount: number;
  /** Rows with an Est Value. Gain / Loss may cover fewer; see above. */
  markedCount: number;
};

export type PortfolioData = {
  fundName: string;
  fundSizeCents: number | null;
  buckets: AllocationBucket[];
  /** Deals that could not be plotted, and why. */
  excluded: { name: string; missing: string }[];
  /** Oldest funded first. Every deal in the fund, plotted or not. */
  investments: InvestmentRow[];
  investmentTotals: InvestmentTotals;
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
 * The tones are ARC IDENTITY, not state. `ui-governance.md` § 3 carves the
 * donut out of the badge rule for exactly this reason: a chart is a vocabulary
 * the design system has no words for. The full argument for which colour went
 * where — and why `red` is not among them — is at `BucketTone`.
 *
 * **Typed against Prisma's own enum, so a missing bucket fails the BUILD.**
 * Added 2026-10-10 with Oil & Gas and Real Estate: before this the map was an
 * untyped literal, a new instrument was not a type error, and the only thing
 * catching it was the runtime guard below — which puts a real holding in the
 * "not shown on the chart" line until somebody notices. `Record<Instrument, …>`
 * moves that to `tsc`, where the next asset class cannot be half-added.
 *
 * **Declaration order IS arc order** (see `loadPortfolio`), so reordering these
 * lines reorders the chart. The original two stay first on purpose: adding an
 * asset class must not reshuffle arcs somebody already knows.
 */
const BUCKETS: Record<
  $Enums.Instrument,
  { id: string; label: string; tone: AllocationBucket["tone"] }
> = {
  PRIVATE_EQUITY: { id: "equity", label: "Private Equity", tone: "accent" },
  PRIVATE_CREDIT: { id: "credit", label: "Private Credit", tone: "green" },
  OIL_AND_GAS: { id: "oil-gas", label: "Oil & Gas", tone: "salmon" },
  REAL_ESTATE: { id: "real-estate", label: "Real Estate", tone: "purple" },
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
      // An instrument the chart has no bucket for. **No longer reachable by
      // forgetting a bucket** — `BUCKETS` is exhaustive against Prisma's enum
      // and that is a build error now. What is left is the deploy-order case: a
      // migration applied against a client generated before it, where the
      // database returns a value this build has never heard of. Named rather
      // than dropped, so it is visible on the screen instead of in a diff.
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

  /*
    The investments table (owner, 2026-10-11: "sorted by oldest at top to
    newest at bottom").

    **Every deal in the fund, not just the plotted ones.** The chart drops a
    deal with no instrument because there is no arc for it to join; a table has
    no such constraint, and a position missing from BOTH views is a position
    nobody can see. So this list is built from `fund.deals` directly rather
    than from the buckets above.

    Undated deals sort LAST, not first. "Oldest at top" has no answer for a row
    with no date, and defaulting a missing date to the epoch would file it above
    every real investment — the one place it is certainly wrong.
  */
  const investments: InvestmentRow[] = [...fund.deals]
    .sort((a, b) => {
      const at = a.investmentDate?.getTime();
      const bt = b.investmentDate?.getTime();
      if (at === undefined && bt === undefined) return a.id - b.id;
      if (at === undefined) return 1;
      if (bt === undefined) return -1;
      // Same day, two deals: fall back to id so the order is stable rather
      // than whatever the sort happens to do with a tie.
      return at - bt || a.id - b.id;
    })
    .map((deal) => {
      const sizeCents = deal.amountCents === null ? null : Number(deal.amountCents);
      const estValueCents =
        deal.estValueCents === null ? null : Number(deal.estValueCents);
      return {
        name: deal.name,
        fundedOn: deal.investmentDate
          ? deal.investmentDate.toISOString().slice(0, 10)
          : null,
        sizeCents,
        estValueCents,
        // Null unless BOTH sides are known. A missing mark is not "no change".
        gainLossCents:
          sizeCents === null || estValueCents === null
            ? null
            : estValueCents - sizeCents,
      };
    });

  /*
    Summed per COLUMN, each over the rows that actually show a number in it —
    see `InvestmentTotals`. Keying all three off one subset was the first
    version of this and it was wrong: a deal with a value but no size would
    print an Est Value the footer did not include, so the column would not add
    up to its own total.
  */
  const valued = investments.filter((r) => r.estValueCents !== null);
  const withGain = investments.filter((r) => r.gainLossCents !== null);
  const investmentTotals: InvestmentTotals = {
    sizeCents: investments.reduce((sum, r) => sum + (r.sizeCents ?? 0), 0),
    // Null rather than 0 when nothing is marked: a zero total value would read
    // as "the book is worthless" instead of "nobody has valued it".
    estValueCents: valued.length
      ? valued.reduce((sum, r) => sum + (r.estValueCents ?? 0), 0)
      : null,
    gainLossCents: withGain.length
      ? withGain.reduce((sum, r) => sum + (r.gainLossCents ?? 0), 0)
      : null,
    rowCount: investments.length,
    markedCount: valued.length,
  };

  return {
    kind: "ok",
    data: {
      fundName: fund.name,
      investments,
      investmentTotals,
      fundSizeCents: fund.sizeCents === null ? null : Number(fund.sizeCents),
      /*
        A FIXED order, so the chart's arcs never depend on which deal happened
        to be created first — and taken from `BUCKETS`' declaration order rather
        than a second hand-written list. That list existed until 2026-10-10 and
        was the kind of duplicate that goes stale silently: adding an instrument
        to one and not the other drops a real holding off the chart with every
        gate green. Object key order is insertion order for string keys, so the
        order you read in `BUCKETS` is the order drawn.
      */
      buckets: (Object.keys(BUCKETS) as $Enums.Instrument[])
        .map((k) => byInstrument.get(k))
        .filter((b): b is AllocationBucket => b !== undefined),
      excluded,
    },
  };
}
