import type { Metadata } from "next";
import { C } from "@/components/palette";
import { FundAllocation } from "@/components/FundAllocation";
import { PortalShell } from "@/components/PortalShell";
import {
  FUND_AS_OF,
  FUND_BUCKETS,
  FUND_SIZE_CENTS,
} from "@/content/fund-allocation";
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

export default async function Portfolio() {
  const { viewer, bootstrapping } = await getViewer();

  /*
    An investor sees their OWN fund's portfolio and no other (owner,
    2026-08-24). Management sees every fund.

    The figures below are static content for fund 1 — `src/content/fund-allocation.ts`
    — not a per-fund query, because positions and marks are still the decision
    STATE.md records as blocked on a person. So the honest check is against the
    fund this content describes: an investor assigned to fund 1 sees it, and an
    investor assigned to a fund whose numbers do not exist yet is told that
    rather than shown fund 1's.
  */
  const permitted = canSeeFund(viewer, DEFAULT_FUND_ID);

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

          <div style={{ maxWidth: 780 }}>
            <FundAllocation
              fundSizeCents={FUND_SIZE_CENTS}
              buckets={FUND_BUCKETS}
              asOf={FUND_AS_OF}
            />
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
