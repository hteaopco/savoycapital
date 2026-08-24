import type { Metadata } from "next";
import { C } from "@/components/palette";
import { FundAllocation } from "@/components/FundAllocation";
import { PortalShell } from "@/components/PortalShell";
import { FUND_AS_OF } from "@/content/fund-allocation";
import { loadPortfolio } from "@/lib/portfolio";
import { canSeeFund, getViewer } from "@/lib/authz";
import { DEFAULT_FUND_ID } from "@/lib/db";

/**
 * Portfolio — how the fund's capital is split, and what sits inside each split.
 *
 * This is the page that was at `/portfolio`, then briefly at `/portal`. It sits
 * one level deeper now that the portal is a section with its own sidebar, and
 * `next.config.mjs` keeps a 308 from the original path so the link that was
 * shared before any of this still resolves.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list — not from anything on this page. Do not add it there. The window
 * where this shipped open, reachable by anyone holding the URL, is closed.
 *
 * `noindex` stays. It is no longer load-bearing now that a crawler cannot reach
 * the page at all, but a private surface has no business in an index either way.
 */
export const metadata: Metadata = {
  title: "Portfolio — Savoy Capital",
  robots: { index: false, follow: false },
};

/**
 * `force-dynamic` because the page now asks who is looking. Without it Next
 * prerenders at build time, where there is no session and no database, and the
 * answer would be baked into a static file.
 */
export const dynamic = "force-dynamic";

/** The dashed empty card — DESIGN_SYSTEM § 2's radius-10 step for this state. */
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 780,
        padding: 24,
        borderRadius: 10,
        border: `1px dashed ${C.borderStrong}`,
        background: C.bgAlt,
        color: C.textMuted,
        fontSize: 13,
        textAlign: "center",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

export default async function Portfolio() {
  const { viewer, bootstrapping } = await getViewer();

  /*
    Which fund's portfolio this is. An investor sees their OWN and no other
    (owner, 2026-08-24); management sees the fund it is assigned to, falling
    back to fund 1.

    The figures are now READ FROM THE DATABASE rather than from
    `src/content/fund-allocation.ts` (owner: "lets tie the portfolio values to
    the values in fund and investments"). Before this, editing a fund's size in
    Fund & Users changed nothing here — two sources for one figure, and the
    screen rendered the one nobody could edit.
  */
  const fundId =
    viewer.kind === "investor"
      ? viewer.fundId
      : (viewer.kind === "management" ? viewer.fundId : null) ?? DEFAULT_FUND_ID;

  const permitted = canSeeFund(viewer, fundId);

  // Loaded only once the viewer is permitted — a denied viewer should not cause
  // a query for figures they may not see, even one whose result is discarded.
  const result = permitted ? await loadPortfolio(fundId) : null;
  const portfolio = result?.kind === "ok" ? result.data : null;

  if (!permitted) {
    return (
      <PortalShell title="Portfolio" isManagement={viewer.kind === "management"}>
        <div className="px-5 py-8 md:px-8 md:py-10">
          <div className="flex flex-col" style={{ gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Portfolio</div>
            <div
              style={{
                maxWidth: 720,
                padding: 24,
                borderRadius: 10,
                border: `1px dashed ${C.borderStrong}`,
                background: C.bgAlt,
                color: C.textMuted,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {viewer.kind === "unassigned"
                ? "Your account has no role assigned yet. Ask management to assign one."
                : viewer.kind === "unconfigured"
                  ? "The database is not configured, so permissions cannot be read."
                  : "There is no portfolio published for your fund yet."}
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Portfolio" isManagement={viewer.kind === "management"}>
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Portfolio</div>

          {/*
            The bootstrap valve is showing. Surfaced rather than silent, so
            "why can everyone see everything" has a visible answer — see
            `src/lib/authz.ts` for why the valve exists at all.
          */}
          {bootstrapping ? (
            <div
              style={{
                maxWidth: 780,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${C.amberBorder}`,
                background: C.amberBg,
                color: C.amber,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong>No roles are assigned yet</strong>, so everyone signed in is treated
              as management. Assign one under Fund &amp; Users and this stops.
            </div>
          ) : null}

          {/*
            Four states, kept apart on purpose. "No database" is a broken deploy,
            "no such fund" is a database that works and has nothing in it, "no
            fund size" is a figure nobody has entered, and "no plottable deals"
            is a chart with nothing to draw. Each sends you somewhere different,
            so collapsing them would send somebody to fix the wrong thing —
            "the database is not configured" on a working database being the
            worst of the four.
          */}
          {result === null || result.kind === "no-database" ? (
            <EmptyState>
              The database is not configured, so the portfolio cannot be read.
            </EmptyState>
          ) : result.kind === "no-fund" ? (
            <EmptyState>
              There is no fund <strong>#{result.fundId}</strong> yet. Create one under
              Fund &amp; Users and its deals appear here.
            </EmptyState>
          ) : result.data.fundSizeCents === null ? (
            <EmptyState>
              <strong>{result.data.fundName}</strong> has no fund size set, and every share
              on this chart is a share of it. Set it under Fund &amp; Users.
            </EmptyState>
          ) : result.data.buckets.length === 0 ? (
            <EmptyState>
              No deals in <strong>{result.data.fundName}</strong> have both an investment
              size and an instrument yet. Set them in the Deal Room and they appear here.
            </EmptyState>
          ) : (
            <div style={{ maxWidth: 780 }}>
              <FundAllocation
                fundSizeCents={result.data.fundSizeCents}
                buckets={result.data.buckets}
                asOf={FUND_AS_OF}
              />
            </div>
          )}

          {/*
            Named, not dropped. A chart of a fund's money is the last place to
            omit a row quietly — if a deal is missing from the arcs, the screen
            says which and what it needs.
          */}
          {portfolio && portfolio.excluded.length > 0 ? (
            <div
              style={{
                maxWidth: 780,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${C.amberBorder}`,
                background: C.amberBg,
                color: C.amber,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <strong>Not shown on the chart:</strong>{" "}
              {portfolio.excluded.map((e) => `${e.name} (no ${e.missing})`).join(", ")}.
              Set the missing values in the Deal Room.
            </div>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}
