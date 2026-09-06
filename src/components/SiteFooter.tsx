import Link from "next/link";
import { C } from "./palette";
import { eyebrow } from "./type";

/**
 * The public site's footer.
 *
 * ## Why it is back
 *
 * A footer was cut on 2026-08-23 along with the instrument cards — "until we get
 * more formal" (owner). "Make it more professional" (owner, 2026-09-06) is that
 * moment: a firm's website that simply stops after its last card reads unfinished,
 * and the missing close was the single largest reason this page did not look like
 * a fund's site. **This reverses a cut the owner made, on the reading that the new
 * instruction supersedes the old one.** If that reading is wrong, this component
 * and its line in `page.tsx` are the whole change to remove.
 *
 * ## What it deliberately does NOT carry
 *
 * **No securities disclosure, and no bracketed placeholder standing in for one.**
 * `FACTS.md` § "securities marketing" is still open pending counsel, and the two
 * wrong ways to handle that are (a) drafting disclosure language here, which is
 * guessing at law, and (b) shipping `[DISCLOSURE TBD]` to a live public page,
 * which is worse than saying nothing at all and is exactly the kind of visible
 * placeholder this page was cleaned of once already. So the footer ships without
 * one and the gap stays a known gap. **When counsel answers, the language lands
 * here** — that is what the space below the rule is for.
 *
 * No contact address, no email, no phone, no social links: none exist as facts in
 * `.claudet/FACTS.md`, and inventing a plausible one on a fund's public page is a
 * hardcoding violation with real-world consequences rather than a styling choice.
 *
 * ## Copy
 *
 * The one sentence is the site's own `<meta name="description">` from
 * `src/app/layout.tsx` — already public, so it introduces no new claim. Same rule
 * as `SiteHero`.
 */
export function SiteFooter() {
  // Computed, not written. A hardcoded year is wrong every January, and it is
  // the sort of literal `CLAUDE.md`'s NO HARDCODING rule exists to catch even
  // though this one carries no money in it.
  const year = new Date().getFullYear();

  return (
    // The top rule STAYS, which is the opposite call to the one made on the
    // carousel's image frame in `RecentInvestments` — and deliberately so.
    // There, content (a logo, a cropped photo) already defined the region and
    // the border was drawn between two identical whites. Here two full-width
    // page bands meet and nothing else marks the seam: `C.bgAlt` above against
    // `C.bg` here is #f8fafc on #ffffff, which is a real difference in the
    // palette and very nearly none on a poor display. A tone change is not a
    // reliable separator between two near-whites; a hairline is.
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-[1120px] px-5 py-12 md:px-10 md:py-16">
        {/*
          Identity left, action right — the nav's arrangement, closing the page
          the way it opened. Wraps to a stack below md rather than squeezing.
        */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-[420px] flex-col gap-3">
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: ".14em",
                color: C.text,
              }}
            >
              SAVOY CAPITAL
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.textMuted }}>
              A private investment fund making private equity and private debt
              investments.
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div style={{ ...eyebrow, color: C.textDim }}>Investors</div>
            {/*
              44px on touch, the footer's own density from md up — the pattern
              `SiteNav` and `FundAllocation` already run on. A pointer is not a
              thumb, so nothing moves on desktop.
            */}
            <Link
              href="/portal"
              className="inline-flex items-center self-start min-h-[44px] md:min-h-0 md:self-auto"
              style={{
                color: C.accent,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Investor Portal
            </Link>
          </div>
        </div>

        {/*
          The rule is the only chrome in here, and it earns it: it separates the
          firm's identity from the legal line, which are different kinds of
          statement. Counsel's disclosure language, when it arrives, sits below
          it beside the copyright.
        */}
        <div
          className="mt-10 flex flex-col gap-2 pt-6 md:mt-12"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div
            style={{
              fontSize: 12,
              color: C.textDim,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            &copy; {year} Savoy Capital. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
