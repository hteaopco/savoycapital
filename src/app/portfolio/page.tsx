import type { Metadata } from "next";
import { C } from "@/components/palette";
import { FundAllocation } from "@/components/FundAllocation";
import { SiteNav } from "@/components/SiteNav";
import {
  FUND_AS_OF,
  FUND_BUCKETS,
  FUND_SIZE_CENTS,
} from "@/content/fund-allocation";

/**
 * The portfolio monitor. Reached from "Investor login" (owner, 2026-08-23).
 *
 * **This route is not authenticated.** There is no auth in the repo yet; the
 * owner's call was to ship it open on the grounds that nobody is visiting the
 * site during the window before auth lands. People, maybe — crawlers arrive on
 * their own and an indexed page outlives the window, so the page is `noindex,
 * nofollow`. That is a mitigation, not a substitute: anyone with the URL can
 * read the fund's size and its position-level amounts. Put this behind the auth
 * boundary before the site is promoted anywhere, and drop the robots block at
 * the same time.
 */
export const metadata: Metadata = {
  title: "Portfolio — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function Portfolio() {
  return (
    <main>
      <SiteNav action={{ href: "/", label: "Public site" }} />

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-10 md:py-12">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Portfolio</div>
            <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 640 }}>
              One fund, three positions.
            </div>
          </div>

          <div style={{ maxWidth: 720 }}>
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
