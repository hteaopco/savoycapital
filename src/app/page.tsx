import { DEFAULT_FUND_ID } from "@/lib/db";
import { loadCommittedCapitalCents } from "@/lib/portfolio";
import { INVESTMENTS } from "@/content/investments";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHero } from "@/components/SiteHero";
import { SiteNav } from "@/components/SiteNav";
import {
  AtAGlance,
  SiteApproach,
  SiteContact,
  WhatWeLookFor,
} from "@/components/SiteSections";

/**
 * The public landing page.
 *
 * Built to the owner's written spec, 2026-09-06. Its own framing: a revision,
 * not a redesign — the palette, type and grid are unchanged, and what moved is
 * content and structure.
 *
 * **The page's job is legitimacy, not fundraising.** The audience is business
 * owners, brokers and intermediaries deciding whether Savoy is a real
 * counterparty; existing investors only use the portal link. That is why there
 * are no performance figures anywhere, no team page, no bios, and no language
 * inviting investment — three of those are the spec's explicit constraints and
 * the last is a legal one (`FACTS.md` § "securities marketing", still open).
 *
 * The order is the spec's:
 *
 *   nav → hero → approach → at a glance → portfolio → what we look for
 *       → contact → footer
 *
 * Single page, anchor-free, no routing beyond the existing portal destination.
 */

/**
 * Statically rendered, revalidated hourly.
 *
 * The one figure that can change is committed capital, which is read from
 * Postgres so the public page and Fund & Users cannot disagree (DECISIONS
 * 2026-08-24, "there is one source for a fund figure"). Without `revalidate`
 * that read would be frozen at build time and the rule would be defeated by a
 * cache instead of by a literal.
 *
 * An hour is chosen because the alternative — rendering per request — puts the
 * marketing page's availability behind the database's for a number that changes
 * a few times a year.
 */
export const revalidate = 3600;

export default async function Home() {
  const committedCents = await loadCommittedCapitalCents(DEFAULT_FUND_ID);

  return (
    <main>
      <SiteNav action={{ href: "/portal", label: "Investor Portal" }} />

      <SiteHero />

      <SiteApproach />

      {/*
        `committedCapital` is null whenever the database is unreachable or
        unset — CI builds in exactly that state — and the block is then omitted
        rather than filled with a fallback. A gap is honest; a stale figure
        quoted to a broker is not.

        The count is derived from the list the grid below renders, so the two
        can never disagree.
      */}
      <AtAGlance
        committedCapital={formatCommitted(committedCents)}
        investmentCount={INVESTMENTS.length}
      />

      <PortfolioGrid />

      <WhatWeLookFor />

      <SiteContact />

      <SiteFooter />
    </main>
  );
}

/**
 * Whole millions, because the row is read at a glance and "$10,000,000" is
 * three tokens of precision nobody uses here. Not `formatCents` from
 * `src/lib/money.ts`: that renders the exact dollar figure the portal needs,
 * and this is the public headline version of the same number.
 *
 * Under a million it falls back to the exact figure rather than rounding to
 * "$0M", which is the failure this kind of shortening usually ships with.
 */
function formatCommitted(cents: number | null): string | null {
  if (cents === null) return null;

  const dollars = Math.round(cents / 100);
  if (dollars < 1_000_000) {
    return `$${dollars.toLocaleString("en-US")}`;
  }

  const millions = dollars / 1_000_000;
  const rendered = Number.isInteger(millions)
    ? String(millions)
    : millions.toFixed(1);
  return `$${rendered}M`;
}
