import type { Metadata } from "next";
import { C } from "@/components/palette";
import { FundAllocation } from "@/components/FundAllocation";
import { PortalShell } from "@/components/PortalShell";
import {
  FUND_AS_OF,
  FUND_BUCKETS,
  FUND_SIZE_CENTS,
} from "@/content/fund-allocation";

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

export default function Portfolio() {
  return (
    <PortalShell title="Portfolio">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Portfolio</div>

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
