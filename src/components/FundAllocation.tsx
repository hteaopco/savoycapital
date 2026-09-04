"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "./palette";
import {
  CONNECTOR_MS,
  CONNECTOR_WEIGHT,
  EDGE_MS,
  EDGE_WEIGHT,
  FADE_DELAY_MS,
  FADE_MS,
} from "./panel-motion";

/**
 * Fund Allocation — how the fund's committed capital is split across
 * instruments, and which positions sit inside each split.
 *
 * Two things about this component are load-bearing and easy to undo by accident:
 *
 * 1. **Unallocated is DERIVED, never supplied.** It is the fund size less
 *    everything deployed. Accepting it as an input is how a chart ends up
 *    showing three figures that don't add to the fund — which is exactly what
 *    happened to the numbers this was first drawn from.
 * 2. **The percentages are always share of the FUND**, including the ones on a
 *    drill-down row. A holding shown as a share of its bucket would read as a
 *    bigger position than it is.
 *
 * On the SVG: design/AP_DESIGN_REFERENCE.md § 2 says "lucide-react icons
 * exclusively. No other icon set, no inline SVG." That rule is written for
 * icons — the chevron below obeys it — and the design system has no vocabulary
 * for a chart. A donut cannot be drawn out of lucide glyphs, so the arcs are
 * inline SVG by necessity. Every colour in them still comes from `C`.
 */

/**
 * One line of a position's terms.
 *
 * Deliberately a flat label/value list rather than a typed schema. What a
 * position actually holds — rate, term, amortisation, accrual for debt;
 * ownership, basis, marks for equity — is the decision `STATE.md` records as
 * blocked on a person. Inventing that shape here to make this panel prettier
 * would be guessing the product's core model, so the panel renders what it is
 * given and the schema lands when the answer does.
 */
export type DetailRow = {
  label: string;
  value: string;
};

/** A single position inside a bucket. */
export type Holding = {
  name: string;
  /**
   * The investment thesis, shown as its OWN panel further down the chain
   * (owner, 2026-08-24: "i would like tfor the 'why we like it' to be off the
   * card to the right ... the why we like it box after that").
   *
   * Deliberately NOT a `DetailRow`. It briefly was one, and the rows beside it
   * are figures and short clauses — a paragraph sharing their column had to
   * fight their `tabular-nums` and their tight leading. Its own panel is what
   * was asked for and is also what the content wants.
   */
  whyWeLikeIt?: string | null;
  /** Committed capital in integer cents (FACTS.md: money is cents end to end). */
  amountCents: number;
  /**
   * Terms, shown when the row is opened. A holding without them does not open
   * and is not clickable — the alternative, an empty panel on every position we
   * have no terms for, invents a state nobody asked for and reads as a defect.
   */
  detail?: DetailRow[];
};

/** Which `C` tone paints a bucket. Keeps raw hex out of the content module. */
export type BucketTone = "accent" | "green";

export type AllocationBucket = {
  id: string;
  label: string;
  tone: BucketTone;
  holdings: Holding[];
};

export type FundAllocationProps = {
  /** The fund's committed capital, in integer cents. */
  fundSizeCents: number;
  /** Deployed buckets. Unallocated is derived from these — do not pass it in. */
  buckets: AllocationBucket[];
  /** Date of the marks shown, ISO `YYYY-MM-DD`. */
  asOf: string;
};

const TONE: Record<BucketTone, string> = {
  accent: C.accent,
  green: C.green,
};

/**
 * Whole dollars, not the two-decimal `money()` in § 6 of the design reference.
 * That helper is right for invoice cents; at fund scale the trailing ".00" on
 * every row is noise. Still integer cents in, still tabular-nums out.
 */
const money = (cents: number): string =>
  `${cents < 0 ? "-" : ""}$${Math.abs(Math.round(cents / 100)).toLocaleString("en-US")}`;

/** `$10M`, `$1.01M` — the headline inside the ring, where width is scarce. */
const abbrev = (cents: number): string => {
  const millions = (cents / 100_000_000)
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return `$${millions}M`;
};

const pct = (part: number, whole: number): string =>
  `${whole === 0 ? "0.0" : ((part / whole) * 100).toFixed(1)}%`;

const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
};

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between arcs, in path units. Reads as a seam, not a border. */
const ARC_GAP = 3;
const ARC_WIDTH = 26;
const ARC_WIDTH_ACTIVE = 32;

/** UI feedback — design/DESIGN_SYSTEM.md § 0.8 caps this at 200ms. */
const TRANSITION = "160ms ease";

/**
 * The open sweep: accent runs out along the connector, then across the panel's
 * top edge, so the two read as one line travelling from the card to the box.
 *
 * The top edge runs at HALF the connector's speed (owner, 2026-08-24). They no
 * longer overlap end-to-end because of it: the two now start together and the
 * slower one finishes last, which is what keeps the SEQUENCE on § 0.8's 200ms
 * ceiling instead of summing to 300. Opening a panel is UI feedback, so the
 * 400ms content-crossfade carve-out does not apply and 200 is the whole budget
 * — slowing the edge further means taking it out of the connector, not adding
 * to the total.
 */
// Moved to `panel-motion.ts` on 2026-08-24, when the Deal Room grew a second
// connected panel and two copies of these numbers became a drift risk. The
// values are unchanged and the argument above moved with them.

/**
 * The line's weight, and where it begins.
 *
 * It starts at the CARD's right border, not at the row's — the row ends 26px
 * short of it (18px of card padding, 8px of tray padding), so the connector is
 * pushed out by that much and the gap it then crosses is 72px, widened from 40
 * on the owner's ask for more air between the card and the panel. Those two are
 * summed into the panel's own offset: 26 + 72 = 98.
 *
 * All three live in Tailwind classes written out in full rather than in
 * constants. Tailwind scans source text, so a class assembled from a variable
 * looks tidier and silently never reaches the stylesheet — which is exactly
 * what happened on the first draft of this panel.
 *   line   `2xl:left-[calc(100%+26px)]` `2xl:w-[72px]`
 *   panel  `2xl:left-[calc(100%+98px)]` `2xl:w-[320px]`
 */

const numCell: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

/**
 * An opened position's panels, and the lines that run out to them.
 *
 * A CHAIN of two, as of 2026-08-24 (owner: *"i would like tfor the 'why we like
 * it' to be off the card to the right. have the line on the right side of card
 * and the why we like it box after that"*):
 *
 *   card ──── detail panel ──── Why We Like It
 *
 * ## Three layouts, and the middle one is the point
 *
 * | Width | What happens |
 * |---|---|
 * | `≥ 1860px` | The full chain. Both connectors show. |
 * | `2xl` (1536) – 1860 | The tray floats right of the card, panels **stacked**. |
 * | `< 1536` | The tray drops inline under the row, no connectors. |
 *
 * The middle state exists because the alternative was worse in both directions:
 * pushing the whole tray out to 1860 would take the floating detail panel away
 * from everyone between 1536 and 1860 who has it today, and letting the chain
 * run at 1536 would hang the second panel off the right edge. A tray that is a
 * flex COLUMN until it has room to be a flex ROW gets both.
 *
 * ## The breakpoints are RESULTS of arithmetic
 *
 * Same convention as before — measured from the row's right edge, which is 26px
 * inside the card's, so both sums are conservative by that much:
 *
 *   float:  240 sidebar + 64 padding + 780 card + 98 clearance + 320 panel = 1502  → `2xl` (1536)
 *   chain:  ... + 72 second gap + 280 thesis panel                        = 1854  → `min-[1860px]:`
 *
 * That leaves 34px and 6px of slack respectively. **Change ANY of those numbers
 * and re-do both sums** — the failure mode is a panel hanging off the right
 * edge, and it is invisible at every width except the one where it happens.
 * The trade is the owner's to revisit: a narrower card, a tighter gap or a
 * narrower panel each buy back room to chain on smaller screens.
 *
 * The thesis panel is 280 rather than 320 for exactly that reason — it is what
 * the sum had left. If the chain should appear on narrower screens, that is the
 * number to spend, and 1860 moves with it.
 *
 * Mounted only while open, so the sweep replays on every open rather than
 * firing once for the life of the page.
 */
function HoldingDetail({
  holding,
  onClose,
}: {
  holding: Holding;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  // One frame of un-revealed paint is what gives the transition something to
  // move from; setting state directly in render or in a bare effect would land
  // in the same frame and the sweep would never play.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const sweep: React.CSSProperties = {
    background: C.accent,
    transformOrigin: "left center",
    transform: revealed ? "scaleX(1)" : "scaleX(0)",
  };

  /*
    12 = card/panel on `DESIGN_SYSTEM.md` § 2's radius scale, which supersedes
    AP § 3's "10 cards / 12 modals" (owner, 2026-08-24). Shared by both panels
    in the chain so the second cannot drift into looking like a different kind
    of object from the first.
  */
  const panelChrome: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: C.bg,
    boxShadow: C.shadowSm,
    overflow: "hidden",
    opacity: revealed ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-out ${FADE_DELAY_MS}ms`,
  };

  const why = holding.whyWeLikeIt?.trim();

  /*
    The chain's width, and therefore the whole design's constraint.

    Written as two complete class strings rather than assembled, because
    Tailwind scans source text: a class built from a ternary fragment looks
    tidier and silently never reaches the stylesheet. Both strings below appear
    verbatim in the file, which is the only reason they compile.

      320 + 72 + 280 = 672   detail panel, connector, thesis panel
  */
  const trayWidth = why
    ? "2xl:w-[320px] min-[1860px]:w-[672px]"
    : "2xl:w-[320px]";

  return (
    <>
      <div
        aria-hidden
        className="hidden 2xl:block 2xl:w-[72px] 2xl:left-[calc(100%+26px)]"
        style={{
          ...sweep,
          height: CONNECTOR_WEIGHT,
          position: "absolute",
          top: "50%",
          transition: `transform ${CONNECTOR_MS}ms ease-out`,
        }}
      />

      {/*
        The tray that holds the chain. One absolutely-positioned box so the two
        panels move together; inside it they are a flex COLUMN that becomes a
        flex ROW once there is room for the full chain. That is what makes the
        middle state coherent rather than broken — see the header.
      */}
      {/*
        On a phone this tray is a FULL-SCREEN SHEET, not an inline expansion
        (owner, 2026-08-25: "the page slides to the right and just the details
        are showing… then a back button"). That is also `MOBILE_REFERENCE.md`
        § 4's prescribed shape — a detail that renders inline becomes a sheet so
        tapping a row feels like opening a page. Inline, it pushed the bucket
        list around and buried every row below it.

        CSS-only, via `md:`. `useIsMobile()` does not exist in this repo and is
        not needed: the panel is already mounted only while open, so the sheet is
        a matter of POSITION, not of a different tree. That keeps the desktop DOM
        byte-identical and cannot hydrate differently from the server.

        `md:inset-auto` is load-bearing and easy to miss. `inset-0` sets all four
        offsets; without releasing it, `right: 0` and `bottom: 0` would survive
        into the 2xl floating layout and fight `2xl:left-[calc(100%+98px)]`. Each
        mobile-only property is released at `md:` for the same reason.

        The slide and the sheet background live in `globals.css` behind
        `@media (max-width: 767px)`, because an inline style cannot be gated to a
        breakpoint. The background is passed down as a CSS VARIABLE rather than
        written into the stylesheet, so the `C` palette stays the only source of
        colour and no hex appears in CSS.
      */}
      <div
        style={{ "--sc-sheet-bg": C.bg } as React.CSSProperties}
        className={`sc-sheet fixed inset-0 z-50 flex flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-4 md:static md:inset-auto md:z-auto md:mt-2 md:overflow-visible md:px-0 md:pb-0 2xl:mt-0 2xl:absolute 2xl:top-1/2 2xl:-translate-y-1/2 2xl:z-10 2xl:left-[calc(100%+98px)] min-[1860px]:flex-row min-[1860px]:items-center min-[1860px]:gap-0 ${trayWidth}`}
      >
        {/*
          The way back. Phone only — on desktop the panel sits beside the row it
          belongs to and there is nothing to return from.
        */}
        {/*
          `mb-4` sits ON TOP of the tray's own `gap-2`, so the card clears the
          bar by 24px (16 + 8) — both on `DESIGN_SYSTEM.md` § 2's spacing scale.
          At 12px the panel read as fused to the header rather than as a card
          sitting below it (owner, 2026-08-26: "move the card away from the top
          header… so it looks more like a card").

          NO negative top margin here, and the sheet carries no top padding —
          the two go together. A `sticky top-0` element is pinned to its scroll
          container's PADDING EDGE, so a `-mt-4` pulling it flush was cancelled
          the instant it stuck: the bar rendered 16px below its flow position and
          silently ate the same 16px out of the gap below it. Measured, not
          reasoned — the margin was applying and the gap was still 8px. Flow and
          pinned position have to agree, so the bar starts at the sheet's top
          edge and the padding it used to fight is simply not there.

          Mobile-only without a breakpoint prefix, because the bar is `md:hidden`
          — a `display: none` element contributes no margin at all, so nothing
          here can reach the desktop layout.
        */}
        <div
          className="sticky top-0 z-10 -mx-4 mb-4 flex items-center md:hidden"
          style={{
            gap: 4,
            padding: "6px 8px",
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center min-h-[44px]"
            style={{
              gap: 4,
              padding: "0 8px",
              border: "none",
              background: "transparent",
              color: C.accent,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            <ChevronLeft size={18} />
            Portfolio
          </button>
        </div>
        <div className="min-[1860px]:w-[320px] min-[1860px]:shrink-0" style={panelChrome}>
          <div
            aria-hidden
            style={{
              ...sweep,
              height: EDGE_WEIGHT,
              transition: `transform ${EDGE_MS}ms ease-out`,
            }}
          />

          <div
            className="flex items-baseline justify-between"
            style={{
              gap: 10,
              padding: "10px 12px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {/*
              `min-w-0` + `overflowWrap` because this name comes from the
              database, so its length is whatever someone typed. Without the
              first, a flex item refuses to shrink below its longest WORD and the
              row tears the panel sideways; without the second the word overflows
              its own box instead. Measured at a 375px phone: a 273px panel tears
              at a single ~26-character token, and every real holding name today
              is well under that — this is the case that arrives with the data,
              not one that is broken now. § 0.7 lets a NAME wrap or truncate; the
              amount beside it keeps `nowrap` because a value must read in full.
            */}
            <span
              className="min-w-0"
              style={{ fontSize: 12, fontWeight: 800, color: C.text, overflowWrap: "anywhere" }}
            >
              {holding.name}
            </span>
            <span
              style={{ fontSize: 12, fontWeight: 700, color: C.text, ...numCell }}
            >
              {money(holding.amountCents)}
            </span>
          </div>

          {(holding.detail ?? []).map((row, i) => (
            <div
              key={row.label}
              style={{
                padding: "8px 12px",
                borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: C.textDim,
                }}
              >
                {row.label}
              </div>
              {/* Terms wrap; § 0.7 truncates labels and names, never values that
                  must be read in full, and a rate or an amort schedule is one. */}
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  marginTop: 1,
                  ...numCell,
                  whiteSpace: "normal",
                }}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {why ? (
          <>
            {/*
              The second link in the chain. A flex ITEM here rather than an
              absolutely-positioned sibling like the first: the first has to
              reach across a gap between two independent boxes, while this one
              only has to fill the space its own row already leaves. Hidden
              below the chain breakpoint, where the panels stack and a
              horizontal line between them would point at nothing.
            */}
            <div
              aria-hidden
              className="hidden min-[1860px]:block min-[1860px]:w-[72px] min-[1860px]:shrink-0"
              style={{
                ...sweep,
                height: CONNECTOR_WEIGHT,
                transition: `transform ${CONNECTOR_MS}ms ease-out`,
              }}
            />

            <div
              className="min-[1860px]:w-[280px] min-[1860px]:shrink-0"
              style={panelChrome}
            >
              <div
                aria-hidden
                style={{
                  ...sweep,
                  height: EDGE_WEIGHT,
                  transition: `transform ${EDGE_MS}ms ease-out`,
                }}
              />

              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: `1px solid ${C.border}`,
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: C.textDim,
                }}
              >
                Why We Like It
              </div>

              {/*
                Prose, so none of the detail panel's value styling applies: no
                `tabular-nums` (a column mechanism that reads mechanical in a
                sentence) and real leading instead of the 1px nudge a one-line
                value wants.

                `maxHeight` is a CEILING, not a truncation. A few sentences
                never reach it and show no scrollbar at all; a long entry
                scrolls inside the panel rather than stretching the tray past
                the row it is centred on. An investor-facing thesis is the last
                thing to cut off with an ellipsis.
              */}
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 12,
                  color: C.text,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {why}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

export function FundAllocation({
  fundSizeCents,
  buckets,
  asOf,
}: FundAllocationProps) {
  const hatchId = useId();
  /**
   * Every bucket with holdings starts EXPANDED (owner, 2026-08-24: "when you land
   * on portfolio...i want it to expand all private equity and private credit").
   *
   * A Set rather than the single `openId` this used to be: an accordion that
   * closes one bucket to open another cannot show them all at once, which is the
   * thing being asked for.
   */
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(buckets.filter((b) => b.holdings.length > 0).map((b) => b.id)),
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  /** `bucketId:holdingName` — scoped by bucket so two buckets may share a name. */
  const [openHolding, setOpenHolding] = useState<string | null>(null);

  const bucketTotals = buckets.map((b) =>
    b.holdings.reduce((sum, h) => sum + h.amountCents, 0),
  );
  const deployedCents = bucketTotals.reduce((sum, n) => sum + n, 0);
  const unallocatedCents = fundSizeCents - deployedCents;

  const segments = [
    ...buckets.map((b, i) => ({
      id: b.id,
      label: b.label,
      amountCents: bucketTotals[i],
      holdings: b.holdings,
      stroke: TONE[b.tone],
      chip: TONE[b.tone],
    })),
    {
      id: "unallocated",
      label: "Unallocated",
      amountCents: unallocatedCents,
      holdings: [] as Holding[],
      stroke: `url(#${hatchId})`,
      // The hatch says "capacity", not "a third strategy". A solid tone here
      // would read as another mandate the fund does not have.
      chip: `repeating-linear-gradient(45deg, ${C.borderStrong} 0 2px, ${C.bgRow} 2px 4px)`,
    },
  ];

  const picked = segments.find((s) => s.id === pickedId) ?? null;

  /**
   * Expand or collapse a bucket. **Expansion and the donut are separate now**
   * (owner, 2026-08-24) — this used to set `pickedId` too, so collapsing a bucket
   * also changed what the donut read, which is the coupling being removed.
   */
  const toggleBucket = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Collapsing a bucket unmounts its rows; leaving a holding marked open
    // would spring its panel back the next time that bucket is expanded.
    setOpenHolding(null);
  };

  /**
   * Open a position's terms AND point the donut at the bucket it sits in
   * (owner, 2026-08-24: "when i click on 'view details' within a certain bucket
   * is when it would make the doughnut interactive").
   *
   * The two move together deliberately: the donut reads the bucket you are
   * drilling into, and closing the panel returns it to the whole fund. Clicking
   * an arc still picks that segment directly — the chart selects itself — but
   * nothing about EXPANSION touches it any more.
   */
  const openHoldingDetail = (key: string | null, bucketId: string) => {
    setOpenHolding(key);
    setPickedId(key ? bucketId : null);
  };

  let cursor = 0;
  const arcs = segments.map((s) => {
    // A negative remainder (over-committed) cannot be drawn; the legend still
    // reports it, in red, rather than the chart quietly rounding it away.
    const length =
      s.amountCents > 0 ? (CIRCUMFERENCE * s.amountCents) / fundSizeCents : 0;
    const arc = {
      id: s.id,
      stroke: s.stroke,
      dash: `${Math.max(0, length - ARC_GAP)} ${CIRCUMFERENCE - length + ARC_GAP}`,
      offset: -cursor,
      draw: length > 0,
    };
    cursor += length;
    return arc;
  });

  return (
    <div
      style={{
        // 12, matching `RecentInvestments`' card. `DESIGN_SYSTEM.md` § 2: 12 is
        // cards and panels, 10 is larger buttons and dashed "empty" cards. The
        // two surfaces shipped at 12 and 10 for a while, which is the kind of
        // drift no lint sees and a person reading both screens does.
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.bg,
        padding: "16px 18px 18px",
      }}
    >
      <div
        className="flex items-start justify-between flex-wrap"
        style={{ gap: 12 }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
            Fund Allocation
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, ...numCell }}>
            As of {fmtDate(asOf)}
          </div>
        </div>
        <span
          style={{
            padding: "4px 10px",
            // A badge, so 4 — `DESIGN_SYSTEM.md` § 4, "circular / pill badges:
            // always rectangle borderRadius 4". Same value the public page's
            // tags use. Accent is right here and only here: this is the card's
            // one active-state readout, not a category.
            borderRadius: 4,
            background: C.accentBg,
            border: `1px solid ${C.accentBorder}`,
            color: C.accent,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".04em",
            ...numCell,
          }}
        >
          {pct(deployedCents, fundSizeCents)} DEPLOYED
        </span>
      </div>

      <div
        className="flex items-start flex-wrap"
        style={{ gap: 26, marginTop: 18 }}
      >
        <div
          style={{
            position: "relative",
            width: 208,
            height: 208,
            flexShrink: 0,
          }}
        >
          {/* design-ok: inline SVG is a chart, not an icon. `DESIGN_SYSTEM.md`
              § 4 permits exactly this — "inline SVG is NOT banned in general …
              charts, custom data visualizations" — and bans hand-rolled icon
              glyphs, which the chevron above correctly avoids. */}
          <svg
            width={208}
            height={208}
            viewBox="0 0 200 200"
            role="img"
            aria-label={segments
              .map((s) => `${s.label} ${pct(s.amountCents, fundSizeCents)}`)
              .join(", ")}
          >
            <defs>
              <pattern
                id={hatchId}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={C.bgRow} />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={C.borderStrong}
                  strokeWidth="2.5"
                />
              </pattern>
            </defs>
            <g transform="rotate(-90 100 100)">
              {arcs.map((arc) =>
                arc.draw ? (
                  <circle
                    key={arc.id}
                    cx={100}
                    cy={100}
                    r={RADIUS}
                    fill="none"
                    stroke={arc.stroke}
                    strokeWidth={
                      pickedId === arc.id ? ARC_WIDTH_ACTIVE : ARC_WIDTH
                    }
                    strokeDasharray={arc.dash}
                    strokeDashoffset={arc.offset}
                    opacity={!pickedId || pickedId === arc.id ? 1 : 0.35}
                    // Picks, never expands. An arc is the chart selecting
                    // itself; expansion belongs to the legend rows.
                    onClick={() =>
                      setPickedId((prev) => (prev === arc.id ? null : arc.id))
                    }
                    // design-ok: <circle> is not covered by the global cursor rule.
                    // A wedge is a pointer convenience, never the only way in: the
                    // legend rows below are real buttons carrying the same action,
                    // tab-reachable and at the § 7 tap-target floor. That is what
                    // keeps a 26px-wide arc band from being a tap target that misses
                    // it — nothing here is reachable by the arcs alone.
                    style={{
                      cursor: "pointer",
                      transition: `stroke-width ${TRANSITION}, opacity ${TRANSITION}`,
                    }}
                  />
                ) : null,
              )}
            </g>
          </svg>
          <div
            className="flex flex-col items-center justify-center"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: C.textDim,
              }}
            >
              {picked ? picked.label : "Total fund"}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: C.text,
                marginTop: 2,
                ...numCell,
              }}
            >
              {abbrev(picked ? picked.amountCents : fundSizeCents)}
            </div>
            <div
              style={{
                minHeight: 16,
                fontSize: 11,
                color: C.textMuted,
                ...numCell,
              }}
            >
              {picked
                ? `${pct(picked.amountCents, fundSizeCents)} of fund`
                : ""}
            </div>
          </div>
        </div>

        {/*
          The 280px basis is what makes this column sit BESIDE the donut on a wide
          card and wrap under it on a narrow one. Its `min-width` is what stopped it
          being squeezed to nothing before it wrapped — but a min-width is a floor the
          flexbox cannot go under, so once wrapped it kept demanding 280 inside a card
          that had less: measured 280px wide inside a 242px card at a 320px viewport
          (content spilling 38px past the card's own border), and exactly 0px of slack
          at 360px, which is a very common phone width.

          So the floor now applies only from `md:` up, where it does its job. Below it
          the column is full-width under the donut anyway and has nothing to be
          squeezed by, so releasing it costs nothing and the card contains its contents
          at every width. The basis is untouched, so the wrap point does not move.

          `min-width` must NOT go back in the style prop: an inline value beats the
          Tailwind class and this would silently revert while reading as fixed — the
          same trap the carousel dots carry a comment about.
        */}
        <div
          className="flex flex-col min-w-0 md:min-w-[280px]"
          style={{ flex: "1 1 280px" }}
        >
          {segments.map((s) => {
            const isOpen = openIds.has(s.id) && s.holdings.length > 0;
            const isPicked = pickedId === s.id;
            return (
              <div key={s.id} className="flex flex-col">
                {/*
                  44px on touch, the card's own density from md up. § 7 puts the
                  ≥44×44px floor on "every interactive element a thumb hits", and
                  its 36px carve-out explicitly excludes list rows — these are
                  list rows, so the floor applies whole. A pointer is not a thumb,
                  which is why the desktop height is still a design choice; that
                  reading is the one RecentInvestments already runs on. Sizing
                  lives in the className, theming in the style prop.
                */}
                <button
                  onClick={() => toggleBucket(s.id)}
                  aria-expanded={s.holdings.length > 0 ? isOpen : undefined}
                  className="flex items-center min-h-[44px] md:min-h-0"
                  style={{
                    gap: 9,
                    width: "100%",
                    padding: "9px 8px",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    background: isPicked ? C.accentBg : "transparent",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: `background ${TRANSITION}`,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center"
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      color: isOpen ? C.textMuted : C.textDim,
                    }}
                  >
                    {s.holdings.length > 0 ? (
                      <ChevronDown
                        size={14}
                        style={{
                          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                          transition: `transform ${TRANSITION}`,
                        }}
                      />
                    ) : null}
                  </span>
                  {/* design-ok: radius 2 is chart vocabulary, not a badge — this
                      chip mirrors an ARC, and § 2's scale starts at 4, which on a
                      10px square reads as a circle and would then collide with the
                      "no circular badges" rule. Same carve-out as the donut itself. */}
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: s.chip,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: s.amountCents < 0 ? C.red : C.text,
                      ...numCell,
                    }}
                  >
                    {money(s.amountCents)}
                  </span>
                  <span
                    style={{
                      width: 54,
                      textAlign: "right",
                      fontSize: 12,
                      color: s.amountCents < 0 ? C.red : C.textMuted,
                      ...numCell,
                    }}
                  >
                    {pct(s.amountCents, fundSizeCents)}
                  </span>
                  {/*
                    Empty twin of the holding rows' action column, and it moved
                    to AFTER the percentage with them (owner, 2026-08-24). The
                    twin is what keeps a bucket's money and share in the same
                    columns as a holding's; the pair has to move together or the
                    table stops lining up, which is the defect that put the
                    button in a fixed column in the first place.
                  */}
                  <span
                    aria-hidden
                    className="hidden md:block md:w-[104px]"
                    style={{ flexShrink: 0 }}
                  />
                </button>

                {isOpen ? (
                  <div
                    style={{
                      background: C.bgAlt,
                      borderBottom: `1px solid ${C.border}`,
                      padding: "5px 8px 7px 33px",
                    }}
                  >
                    {s.holdings.map((h) => {
                      const key = `${s.id}:${h.name}`;
                      const hasDetail = (h.detail ?? []).length > 0;
                      const isDetailOpen = openHolding === key;

                      return (
                        <div
                          key={h.name}
                          className="2xl:relative"
                          style={{
                            borderLeft: `1px solid ${C.borderStrong}`,
                            paddingLeft: 12,
                          }}
                        >
                          {/*
                            The ROW is inert; the button is the only control on
                            it (owner, 2026-08-24). That restores the cue the
                            last pass spent: a bucket row is clickable and a
                            drill-down row is not, on top of the chevron, the
                            colour chip, and the size and weight the buckets sit
                            above these in the grey tray.

                            It wraps rather than truncates. At 390px the name,
                            amount, share and button want ~354px and the tray
                            gives 260, so on a phone the button drops to a line
                            of its own — § 0.7 lets a NAME truncate but never a
                            money value, and truncating the name to nothing to
                            keep one line would be the worse trade.
                          */}
                          <div
                            className="flex flex-wrap items-center"
                            style={{ gap: 9, padding: "5px 0" }}
                          >
                            <span
                              className="min-w-0"
                              style={{
                                flex: 1,
                                fontSize: 12,
                                fontWeight: 500,
                                color: C.textMuted,
                              }}
                            >
                              {h.name}
                            </span>

                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 400,
                                color: C.textMuted,
                                ...numCell,
                              }}
                            >
                              {money(h.amountCents)}
                            </span>
                            <span
                              style={{
                                width: 54,
                                textAlign: "right",
                                fontSize: 11,
                                color: C.textDim,
                                ...numCell,
                              }}
                            >
                              {pct(h.amountCents, fundSizeCents)}
                            </span>
                            {/*
                              A fixed column, and since 2026-08-24 it sits AFTER
                              the percentage (owner: "move the view details to
                              the right side of the % column").

                              It is still a fixed column rather than a loose last
                              child, and that is load-bearing: the bucket rows
                              carry an empty twin of it, moved in the same change,
                              because without one a bucket's money sits 104px off
                              a holding's. That misalignment is the defect that
                              made this a column originally — the position
                              changed, the reason for the column did not.

                              It only fits as a TEXT column from md up. At 390px
                              the tray gives ~260px and the four cells want ~354,
                              so the words cannot ride the same line — § 0.7 lets
                              a name truncate but never a money value.

                              Below md the label becomes a CHEVRON, which fits.
                              A full-width slot wrapping to its own line was the
                              earlier answer and it cost a line per holding:
                              measured at 390px with four holdings, 95px per row
                              against 55px for the chevron — 378px of tray down
                              to 218px, without truncating anything.

                              The row stays INERT and the button stays the only
                              control on it (owner, 2026-08-24). Making the whole
                              row the tap target is shorter still (32px per row)
                              and is NOT taken here, because it would spend the
                              cue that decision bought — a bucket row is
                              clickable and a drill-down row is not. That is the
                              owner's call to make, not a layout saving to help
                              myself to.

                              Only a position we actually hold terms for gets a
                              button, so the control cannot open an empty box.
                              § 7's floor lands on the button now that it is what
                              a thumb hits: 44px on touch, the tray's density
                              from md up.
                            */}
                            <span
                              className="md:w-[104px] flex justify-end"
                              style={{ flexShrink: 0 }}
                            >
                              {hasDetail ? (
                                <button
                                  onClick={() =>
                                    openHoldingDetail(
                                      isDetailOpen ? null : key,
                                      s.id,
                                    )
                                  }
                                  aria-expanded={isDetailOpen}
                                  aria-label={`View details for ${h.name}`}
                                  className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    // OPEN is a tint, not a solid fill (owner,
                                    // 2026-08-24: "make the link less heavy").
                                    // This is the canon's own alternative to a
                                    // solid tone — DESIGN_SYSTEM.md § 4 calls it
                                    // "subtle tint + colored text" and reserves
                                    // solid fills for a narrow set this is not
                                    // in. The row already carries the state
                                    // twice over: the panel is on screen and the
                                    // donut has swung to this bucket, so the
                                    // button does not have to shout it a third
                                    // time.
                                    border: `1px solid ${isDetailOpen ? C.accentBorder : C.border}`,
                                    background: isDetailOpen ? C.accentBg : C.bg,
                                    color: C.accent,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "inherit",
                                    whiteSpace: "nowrap",
                                    transition: `background ${TRANSITION}, color ${TRANSITION}, border-color ${TRANSITION}`,
                                  }}
                                >
                                  {/*
                                    One control, two labels. The chevron is the
                                    phone's idiom for "opens a page" and it is
                                    what the tap now does — the detail arrives as
                                    a full-screen sheet. The words stay from md
                                    up, where the 104px column has room for them
                                    and the panel opens beside the row instead.

                                    `aria-label` carries the full sentence at
                                    both widths, so the icon-only state is not
                                    an unlabelled button.
                                  */}
                                  <ChevronRight size={16} className="md:hidden" />
                                  <span className="hidden md:inline">View Details</span>
                                </button>
                              ) : null}
                            </span>
                          </div>

                          {isDetailOpen ? (
                            <HoldingDetail
                              holding={h}
                              onClose={() => openHoldingDetail(null, s.id)}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div
            className="flex items-center"
            style={{ gap: 9, padding: "11px 8px 0" }}
          >
            <span style={{ width: 14, flexShrink: 0 }} />
            <span style={{ width: 10, flexShrink: 0 }} />
            <span
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: C.textDim,
              }}
            >
              Total fund
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: C.text,
                ...numCell,
              }}
            >
              {money(fundSizeCents)}
            </span>
            <span
              style={{
                width: 54,
                textAlign: "right",
                fontSize: 12,
                color: C.textMuted,
                ...numCell,
              }}
            >
              100.0%
            </span>
            {/*
              The third twin of the holding rows' action column, and the one
              that was missed when that column moved to the end of the row
              (owner, 2026-08-24). Every row in this table now carries one:
              holdings the real button, buckets and this total an empty span.
              Without it the total's money and share sit 104px right of every
              other row's — flush to the card while the rest stop short of it.

              `md:` on all three, matching them: below md the action slot goes
              full-width on its own line and there is no column to line up with.
            */}
            <span
              aria-hidden
              className="hidden md:block md:w-[104px]"
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
