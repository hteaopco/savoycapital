"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { C } from "./palette";

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

/** A single position inside a bucket. */
export type Holding = {
  name: string;
  /** Committed capital in integer cents (FACTS.md: money is cents end to end). */
  amountCents: number;
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
  const millions = (cents / 100_000_000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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

const numCell: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

export function FundAllocation({ fundSizeCents, buckets, asOf }: FundAllocationProps) {
  const hatchId = useId();
  const [openId, setOpenId] = useState<string | null>(buckets[0]?.id ?? null);
  const [pickedId, setPickedId] = useState<string | null>(null);

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

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
    setPickedId((prev) => (prev === id ? null : id));
  };

  let cursor = 0;
  const arcs = segments.map((s) => {
    // A negative remainder (over-committed) cannot be drawn; the legend still
    // reports it, in red, rather than the chart quietly rounding it away.
    const length = s.amountCents > 0 ? (CIRCUMFERENCE * s.amountCents) / fundSizeCents : 0;
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
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bg,
        padding: "16px 18px 18px",
      }}
    >
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Fund Allocation</div>
          <div style={{ fontSize: 12, color: C.textMuted, ...numCell }}>
            As of {fmtDate(asOf)}
          </div>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 8,
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
        <div style={{ position: "relative", width: 208, height: 208, flexShrink: 0 }}>
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
                <line x1="0" y1="0" x2="0" y2="6" stroke={C.borderStrong} strokeWidth="2.5" />
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
                    strokeWidth={pickedId === arc.id ? ARC_WIDTH_ACTIVE : ARC_WIDTH}
                    strokeDasharray={arc.dash}
                    strokeDashoffset={arc.offset}
                    opacity={!pickedId || pickedId === arc.id ? 1 : 0.35}
                    onClick={() => toggle(arc.id)}
                    // design-ok: <circle> is not covered by the global cursor rule.
                    // Keyboard users reach the same action through the legend buttons.
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
            <div style={{ minHeight: 16, fontSize: 11, color: C.textMuted, ...numCell }}>
              {picked ? `${pct(picked.amountCents, fundSizeCents)} of fund` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-col" style={{ flex: "1 1 280px", minWidth: 280 }}>
          {segments.map((s) => {
            const isOpen = openId === s.id && s.holdings.length > 0;
            const isPicked = pickedId === s.id;
            return (
              <div key={s.id} className="flex flex-col">
                <button
                  onClick={() => toggle(s.id)}
                  aria-expanded={s.holdings.length > 0 ? isOpen : undefined}
                  className="flex items-center"
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
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: s.chip,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>
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
                </button>

                {isOpen ? (
                  <div
                    style={{
                      background: C.bgAlt,
                      borderBottom: `1px solid ${C.border}`,
                      padding: "5px 8px 7px 33px",
                    }}
                  >
                    {s.holdings.map((h) => (
                      <div
                        key={h.name}
                        className="flex items-center"
                        style={{
                          gap: 9,
                          padding: "5px 0 5px 12px",
                          borderLeft: `1px solid ${C.borderStrong}`,
                        }}
                      >
                        <span
                          style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.textMuted }}
                        >
                          {h.name}
                        </span>
                        <span
                          style={{ fontSize: 11, fontWeight: 400, color: C.textMuted, ...numCell }}
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
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex items-center" style={{ gap: 9, padding: "11px 8px 0" }}>
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
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text, ...numCell }}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
