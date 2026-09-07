import Link from "next/link";
import { C } from "./palette";
import { eyebrow } from "./type";
import { FOOTER_DESCRIPTOR, LEGAL_LINE } from "@/content/site";

/**
 * The public site's footer.
 *
 * ## The legal line is the point of this revision
 *
 * The descriptor was already going to change — "private equity and private
 * debt" became three strategies with the new positioning. The addition that
 * matters is the informational-purposes line, and it is worth being precise
 * about what it does and does not do.
 *
 * **It disclaims an offer. It is not clearance.** `FACTS.md` § "securities
 * marketing" is still open: counsel has not read this page, and the owner's
 * build spec names that as an open item blocking go-live, not something this
 * line resolves. A public site plus co-investor conversations moves toward the
 * general-solicitation fact pattern whatever the footer says. So: do not read
 * this line as permission to add offering language above it, and do not let its
 * presence retire the open item.
 *
 * ## Set quiet, not hidden
 *
 * 12px on `C.textDim` — small enough to read as boilerplate, still above the
 * contrast floor. A disclaimer that cannot be read is not a disclaimer, and
 * greying it further to "look legal" would be the wrong instinct.
 */
export function SiteFooter() {
  // Computed. A hardcoded year is wrong every January.
  const year = new Date().getFullYear();

  return (
    // The rule stays: `C.bgAlt` above against `C.bg` here is #f8fafc on
    // #ffffff, which is a real difference in the palette and very nearly none
    // on a poor display. A tone change is not a reliable separator between two
    // near-whites; a hairline is.
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-[1120px] px-5 py-12 md:px-10 md:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-[460px] flex-col gap-3">
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
              {FOOTER_DESCRIPTOR}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div style={{ ...eyebrow, color: C.textDim }}>Investors</div>
            {/* 44px on touch, the footer's own density from md up. A pointer is
                not a thumb, so nothing moves on desktop. */}
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

        <div
          className="mt-10 flex flex-col gap-3 pt-6 md:mt-12"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: C.textDim,
              maxWidth: 720,
            }}
          >
            {LEGAL_LINE}
          </div>
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
