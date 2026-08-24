import type { Metadata } from "next";
import { C } from "@/components/palette";
import { FundAllocation } from "@/components/FundAllocation";
import { UserButton } from "@clerk/nextjs";
import { SiteNav } from "@/components/SiteNav";
import {
  FUND_AS_OF,
  FUND_BUCKETS,
  FUND_SIZE_CENTS,
} from "@/content/fund-allocation";

/**
 * The portfolio monitor. Reached from "Investor login" (owner, 2026-08-23).
 *
 * **This route is now authenticated** (2026-08-24). It is protected by
 * `src/proxy.ts`, which requires a session for every route not on its short
 * public list — so protection comes from `/portfolio` being absent from that
 * list, not from anything on this page. Do not add it there.
 *
 * The window this shipped open in is closed: it was reachable by anyone with
 * the URL, and the URL was linked from the public homepage. `noindex` stays —
 * it is no longer load-bearing now that a crawler cannot reach the page at all,
 * but a private surface has no business in an index either way.
 */
export const metadata: Metadata = {
  title: "Portfolio — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function Portfolio() {
  return (
    <main>
      <SiteNav
        action={{ href: "/", label: "Public site" }}
        trailing={<UserButton />}
      />

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-10 md:py-12">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Portfolio</div>

          <div style={{ maxWidth: 600 }}>
            <FundAllocation
              fundSizeCents={FUND_SIZE_CENTS}
              buckets={FUND_BUCKETS}
              asOf={FUND_AS_OF}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
