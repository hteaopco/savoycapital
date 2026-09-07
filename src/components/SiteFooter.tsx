import { C } from "./palette";
import { LEGAL_LINE } from "@/content/site";

/**
 * The public site's footer — the legal line and a copyright, and nothing else.
 *
 * ## What was removed, and why it is not coming back
 *
 * It carried the wordmark, the firm descriptor, an "Investors" label and a
 * second Investor Portal link until 2026-09-07: "it is too redundant, the
 * investor portal is at the top" (owner). He is right on both counts — the
 * descriptor restated the hero, and a page with one primary action should not
 * offer it twice (`DESIGN_SYSTEM.md` § 0.2). **Do not re-add a nav or a
 * wordmark here** to make the footer look fuller; empty is the intent.
 *
 * ## The legal line is the point of this revision
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
        {/* No inner rule any more: with the identity block gone this is the
            whole footer, and a hairline above the only thing in it would be
            chrome separating nothing. § 0.5. */}
        <div className="flex flex-col gap-3">
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
