import { INVESTMENTS } from "@/content/investments";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHero } from "@/components/SiteHero";
import { SiteNav } from "@/components/SiteNav";
import { SiteContact, WhatWeLookFor } from "@/components/SiteSections";

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
 *   nav → hero → portfolio → what we look for → contact → footer
 *
 * **The hero carries three things, not one** (owner, 2026-09-07): the headline
 * moved to the top of the image and the approach paragraph and the facts row
 * moved up into it from their own bands below. The spec's "one line of copy
 * only" hero is the older instruction — see `SiteHero`'s header.
 *
 * Single page, anchor-free, no routing beyond the existing portal destination.
 */

/**
 * Fully static, and it has nothing left to revalidate.
 *
 * It carried `revalidate = 3600` until 2026-09-07, for one reason: committed
 * capital was read from Postgres, and without a revalidate that read would have
 * been frozen at build time. Removing the figure (owner: "also remove $10M
 * committed") removed the page's only database-backed value, and with it the
 * hourly regeneration — which would otherwise have kept re-rendering an
 * identical page on a schedule for a reason that no longer exists.
 *
 * Everything here is now build-time content. **A future figure read from the
 * database brings `revalidate` back with it**, and the argument above is why:
 * a stale number quoted to a broker is the failure to avoid.
 */

export default function Home() {
  return (
    <main>
      <SiteNav action={{ href: "/portal", label: "Investor Portal" }} />

      {/*
        The count is derived from the list the grid below renders, so the two
        can never disagree.
      */}
      <SiteHero investmentCount={INVESTMENTS.length} />

      <PortfolioGrid />

      <WhatWeLookFor />

      <SiteContact />

      <SiteFooter />
    </main>
  );
}
