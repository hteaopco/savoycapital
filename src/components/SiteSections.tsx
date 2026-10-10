import { C } from "./palette";
import { ContactForm } from "./ContactForm";

/**
 * The landing page's copy section below the fold: Contact.
 *
 * It held three more. The approach paragraph and the "at a glance" facts moved
 * INTO the hero image on 2026-09-07 and live in `SiteHero.tsx`; **"What we look
 * for" was deleted outright on 2026-10-10** (owner: "Delete this entire
 * section"), taking `CRITERIA` and the `Criterion` type with it.
 *
 * So this file is down to one component and the shared column. It is kept as a
 * file rather than folded into `page.tsx` because `COLUMN` is the page's left
 * edge and belongs beside the section that uses it — and because the page has
 * lost sections before and may gain one.
 *
 * Everything here is `DESIGN_SYSTEM.md` § 0.5's rule applied literally: there
 * is now no chrome in this file at all — the two bands are separated by tone
 * and by space, and nothing is drawn to divide them.
 */

/** The shared column. Every section sits on the same left edge as the hero. */
const COLUMN = "mx-auto max-w-[1120px] px-5 md:px-10";

/**
 * Contact.
 *
 * A form as of 2026-09-07, replacing the `mailto:` the build spec asked for.
 * The spec's objection to forms — "a form implies inbox monitoring that does
 * not exist yet" — was answered rather than overruled: submissions land under
 * Admin as **Cold Reach** with a red badge on the nav. See `ContactForm`'s
 * header for why that badge is load-bearing rather than decorative.
 *
 * Still no language inviting investment. "Tell us about the opportunity" is an
 * approach from a counterparty, which is the correct side of the securities
 * line; anything about investing WITH the firm is not.
 */
export function SiteContact() {
  return (
    <div style={{ background: C.bg }}>
      <div className={`${COLUMN} py-16 md:py-24`}>
        <h2
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: C.text,
          }}
        >
          Contact
        </h2>

        <div className="mt-5">
          <p
            className="max-w-[520px]"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.7,
              color: C.textMuted,
            }}
          >
            For owners, brokers, and intermediaries with an opportunity to
            discuss.
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
