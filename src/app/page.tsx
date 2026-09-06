import { RecentInvestments } from "@/components/RecentInvestments";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHero } from "@/components/SiteHero";
import { SiteNav } from "@/components/SiteNav";

/**
 * The public landing page.
 *
 * Reworked 2026-09-06 (owner: "I don't like the landing page. Can we re work it?
 * And make it more professional?"). It was a nav and a carousel on a tinted
 * field, and it ended without closing — no opening statement, no footer, and the
 * carousel's own section header standing in as the page's `<h1>`.
 *
 * The order below is the whole change: **who the firm is, what it has done, and
 * a close.** Every part of that is structure and typography rather than new
 * copy — `FACTS.md` § "securities marketing" is still open, so nothing on this
 * page makes a claim about performance, returns or availability that it was not
 * already making. See `SiteHero`'s header for what that rules out and why.
 */
export default function Home() {
  return (
    <main>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav action={{ href: "/portal", label: "Investor Portal" }} />

      {/* ── Who ─────────────────────────────────────────────────────────── */}
      <SiteHero />

      {/* ── What ────────────────────────────────────────────────────────── */}
      <RecentInvestments />

      {/* ── Close ───────────────────────────────────────────────────────── */}
      <SiteFooter />
    </main>
  );
}
