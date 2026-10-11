import { C } from "./palette";
import type { InvestmentRow, InvestmentTotals } from "@/lib/portfolio";

/**
 * Every investment in the fund, oldest first, with a consolidated row under
 * them (owner, 2026-10-11: "including the investments here in a table sorted by
 * oldest at top to newest at bottom … Investment, fund Date, Size, Est Value,
 * Gain / Loss … consolidatated row under all investments").
 *
 * Built to `design/AP_DESIGN_REFERENCE.md:153` — that is the table pattern in
 * THIS repo's idiom. `DESIGN_SYSTEM.md` § 3.9 states the same rules (overflow-x
 * wrapper, explicit `minWidth`, sticky first column with an OPAQUE background,
 * never truncate a money value) but reaches for a `@/components/primitives`
 * module and CSS custom properties that came from theAPlink and were never
 * carried here. Same rules, the idiom that exists.
 *
 * ## Why a real `<table>`
 *
 * This is tabular data with a header row, so it is a table — the legend beside
 * the donut is a list of buttons and correctly is not one. The cost is two
 * mobile obligations, both of which this takes rather than waives: the wrapper
 * scrolls horizontally so the PAGE never does, and the first column is pinned
 * so a row keeps its identity once the figures scroll out from under it.
 *
 * ## It lists MORE than the chart
 *
 * The donut drops a deal with no instrument, because there is no arc for it to
 * join. A table has no such constraint, so this renders every deal in the fund.
 * A position missing from both views is a position nobody can see.
 *
 * ## Where the mobile waiver sits, and why it is three separate constraints
 *
 * `minWidth: 560` needs a `mobile-ok` waiver, and WHERE that waiver goes is
 * load-bearing in three ways. None of them is visible in the rule's prose;
 * each was established by mutating the thing and watching the gate.
 *
 * 1. **It goes on the `minWidth` line, never above `<table`.** mobile-lint's
 *    waivers are per-LINE and not per-RULE — `isWaived` takes a line and no
 *    rule id, and looks back twelve lines. A waiver sitting above the tag
 *    therefore also waives `table-overflow` and `table-label`, which fire at
 *    the tag's own line, and this file would quietly stop being checked for
 *    its scroll wrapper and its pinned first column while reading as
 *    deliberately waived for a width. That was this file's first version:
 *    with the waiver up there, deleting the pin left the gate GREEN.
 * 2. **Nothing verbose may sit next to the tag.** `table-overflow` looks 900
 *    characters BEHIND `<table` for `overflowX`, and `table-label` looks 900
 *    either side for the pin. The two windows make the space around the tag a
 *    byte budget: this draft's own explanation, written here first as a
 *    comment beside the table, pushed the wrapper out of one window and then
 *    the pin out of the other. Hence a docblock. Run `scripts/mobile-lint.mjs`
 *    after adding anything between the wrapper, the tag and the header row.
 * 3. **Prose must never spell the waiver token.** `isWaived` reads the
 *    ORIGINAL text rather than the masked text, and has to: a waiver lives in
 *    a comment, so masking comments would blind it. The cost is that typing
 *    the token while DESCRIBING it is indistinguishable from claiming it — a
 *    sentence here warning about stray waivers was itself a stray waiver,
 *    silencing both table rules two lines from the warning.
 *
 * The first and third are properties of the gate rather than of this table.
 * They are written down here because nothing in the repo catches them and the
 * next table will meet all three.
 */

/* Header cell. AP_DESIGN_REFERENCE.md:155. */
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 10px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: C.textDim,
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  borderBottom: `1px solid ${C.border}`,
};

/**
 * Money, dates and counts. **Never truncated** — § 0.7 lets a NAME ellipsis and
 * never a value somebody has to read in full, which is also why the table
 * carries a `minWidth` and scrolls rather than squeezing these.
 */
const tdNum: React.CSSProperties = {
  ...td,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

const thNum: React.CSSProperties = { ...th, textAlign: "right" };

/** Whole dollars, signed. A fund's gain is not read to the penny. */
function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(cents / 100)).toLocaleString("en-US")}`;
}

/** Signed, so a gain reads as one at a glance and not only by its colour. */
function signedMoney(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(cents / 100)).toLocaleString("en-US")}`;
}

/** An em dash, for a figure nobody has supplied. Never a 0 — see `estValueCents`. */
const BLANK = "—";

/**
 * Gain green, loss red, flat muted.
 *
 * `ui-governance.md` § 3's standing rule is that a tone encodes STATE and never
 * a category — and a position being up or down IS a state, so this is the rule
 * applied rather than an exception to it. The donut's arcs are the other case:
 * identity, which is why they needed their own tokens.
 */
function gainColor(cents: number): string {
  if (cents > 0) return C.green;
  if (cents < 0) return C.red;
  return C.textMuted;
}

export function InvestmentsTable({
  rows,
  totals,
}: {
  rows: InvestmentRow[];
  totals: InvestmentTotals;
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "48px 16px",
          textAlign: "center",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.bg,
          color: C.textMuted,
          fontSize: 13,
        }}
      >
        No investments in this fund yet. They appear here as deals are created.
      </div>
    );
  }

  const unmarked = totals.rowCount - totals.markedCount;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: C.bg,
          overflow: "hidden",
        }}
      >
        {/*
          The scroller. The table carries an explicit width below it and the
          PAGE never scrolls sideways — a page doing that because a table broke
          out is the bug `MOBILE_REFERENCE` § 3 puts first.
        */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {/*
            560 is the five columns at their un-squeezed widths. It is above the
            `fixed-width` rule's 300 ceiling on purpose and is the case that
            rule carves out: the number lives on a table INSIDE an overflow-x
            scroller, where it cannot reach the page, and `DESIGN_SYSTEM.md`
            § 3.9 requires it ("The table itself gets explicit minWidth").
            Without it the money columns would compress and § 0.7 forbids
            truncating a value.
          */}
          <table
            style={{
              width: "100%",
              // mobile-ok: table minWidth inside an overflowX scroller, per § 3.9; it cannot reach the page. Placement is deliberate — see docblock.
              minWidth: 560,
              borderCollapse: "collapse",
              fontFamily: "inherit",
            }}
          >
            <thead>
              <tr>
                {/*
                  Pinned, with an OPAQUE background. A transparent sticky cell
                  lets the scrolled columns bleed through it, so the name and a
                  number overlap mid-scroll — the exact failure § 3.9 calls out.
                */}
                <th
                  style={{
                    ...th,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    background: C.bg,
                  }}
                >
                  Investment
                </th>
                <th style={th}>Fund Date</th>
                <th style={thNum}>Size</th>
                <th style={thNum}>Est Value</th>
                <th style={thNum}>Gain / Loss</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => {
                // Zebra, AP_DESIGN_REFERENCE.md:154. The sticky cell repeats
                // the row's own background so the stripe does not break at the
                // frozen column.
                const rowBg = i % 2 ? C.bgAlt : C.bg;
                return (
                  <tr key={`${r.name}:${i}`} style={{ background: rowBg }}>
                    <th
                      scope="row"
                      style={{
                        ...td,
                        textAlign: "left",
                        fontWeight: 600,
                        color: C.text,
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        background: rowBg,
                        // A NAME may truncate; § 0.7 draws the line at values.
                        maxWidth: 220,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.name}
                    </th>
                    <td style={{ ...tdNum, textAlign: "left", color: C.textMuted }}>
                      {r.fundedOn ?? BLANK}
                    </td>
                    <td style={{ ...tdNum, color: C.text }}>
                      {r.sizeCents === null ? BLANK : money(r.sizeCents)}
                    </td>
                    <td style={{ ...tdNum, color: C.text }}>
                      {r.estValueCents === null ? BLANK : money(r.estValueCents)}
                    </td>
                    <td
                      style={{
                        ...tdNum,
                        fontWeight: 600,
                        color:
                          r.gainLossCents === null
                            ? C.textDim
                            : gainColor(r.gainLossCents),
                      }}
                    >
                      {r.gainLossCents === null
                        ? BLANK
                        : signedMoney(r.gainLossCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/*
              The consolidated row, in a `<tfoot>` rather than a last `<tr>`:
              it is a summary of the rows above and not one of them, and a
              screen reader should be told which.
            */}
            <tfoot>
              <tr style={{ background: C.bgRow }}>
                <th
                  scope="row"
                  style={{
                    ...td,
                    textAlign: "left",
                    borderBottom: "none",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: C.textDim,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    background: C.bgRow,
                    whiteSpace: "nowrap",
                  }}
                >
                  All investments
                </th>
                <td style={{ ...tdNum, borderBottom: "none" }} />
                <td
                  style={{
                    ...tdNum,
                    borderBottom: "none",
                    fontWeight: 800,
                    color: C.text,
                  }}
                >
                  {money(totals.sizeCents)}
                </td>
                <td
                  style={{
                    ...tdNum,
                    borderBottom: "none",
                    fontWeight: 800,
                    color: C.text,
                  }}
                >
                  {totals.estValueCents === null
                    ? BLANK
                    : money(totals.estValueCents)}
                </td>
                <td
                  style={{
                    ...tdNum,
                    borderBottom: "none",
                    fontWeight: 800,
                    color:
                      totals.gainLossCents === null
                        ? C.textDim
                        : gainColor(totals.gainLossCents),
                  }}
                >
                  {totals.gainLossCents === null
                    ? BLANK
                    : signedMoney(totals.gainLossCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/*
        What the total does NOT cover, said out loud.

        Each footer cell is the sum of the numbers visible in ITS column and
        nothing else, so a reader who adds a column up gets the total shown.
        The three therefore cover different subsets. Treating an unmarked
        position as worth nothing would be a wrong number stated confidently,
        and carrying it at cost would assert a valuation nobody made — so the
        figures cover what they cover and the ratio is printed rather than
        implied.

        This note tracks Est Value, which is the column a mark is missing
        from. Gain / Loss can cover fewer rows still — a valued deal with no
        size has no gain to compute — and that deal is named by name in the
        "Not shown on the chart" banner the page prints above this table, so it
        is not a position going quietly missing.
      */}
      {unmarked > 0 ? (
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
          Est Value covers{" "}
          <strong>
            {totals.markedCount} of {totals.rowCount}
          </strong>{" "}
          investments. {unmarked === 1 ? "One has" : `${unmarked} have`} no
          estimated value set — add one in the Deal Room and it joins the total.
        </div>
      ) : null}
    </div>
  );
}
