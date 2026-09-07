import { C } from "./palette";
import { eyebrow } from "./type";
import { CRITERIA } from "@/content/site";
import { ContactForm } from "./ContactForm";

/**
 * The landing page's copy sections: What we look for, and Contact.
 *
 * It held two more — the approach paragraph and the "at a glance" facts — until
 * the owner moved both INTO the hero image on 2026-09-07. They live in
 * `SiteHero.tsx` now; this file is what is left below the fold.
 *
 * Two small server components in one file because they are one thing — the body
 * of a single page, sharing a measure, a rhythm and a left edge. Neither is
 * reused anywhere else.
 *
 * Everything here is `DESIGN_SYSTEM.md` § 0.5's rule applied literally: there
 * is now no chrome in this file at all — the two bands are separated by tone
 * and by space, and nothing is drawn to divide them.
 */

/** The shared column. Every section sits on the same left edge as the hero. */
const COLUMN = "mx-auto max-w-[1120px] px-5 md:px-10";

/**
 * What we look for — three parallel descriptions, not a sequence.
 *
 * No checkmarks, no bullets, no numbers (spec): a marker would imply an order
 * or a checklist, and these are three independent mandates. The heading is an
 * `<h2>`; the hero owns the page's only `<h1>`.
 *
 * This is the block brokers actually read, so it is the one that must not grow.
 * The internal deck's full criteria do not belong on a public page.
 */
export function WhatWeLookFor() {
  return (
    <div style={{ background: C.bgAlt }}>
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
          What we look for
        </h2>

        {/*
          Four columns, and the breakpoint is ARITHMETIC rather than taste.

          A readable measure for this copy is ~30 characters, which at 15px is
          about 220px. Four of those plus three 32px gutters needs 976px of
          content box. The column is capped at 1120 with 80px of padding, so it
          gives 1040 at `xl` and above — comfortable — and 944 at `lg`, which
          lands each column at 212px. Tight but honest.

          At `md` (768px) the same sum gives 136px a column, which is four
          words a line. So `md:` carries TWO columns and the fourth arrives at
          `lg:`. DECISIONS 2026-08-24 allows a second breakpoint above `md`
          when it is derived and shown at the call site; this is that.
        */}
        <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {CRITERIA.map((criterion) => (
            <div key={criterion.label} className="flex flex-col gap-3">
              <div style={{ ...eyebrow, color: C.accent }}>
                {criterion.label}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.7,
                  color: C.textMuted,
                  textWrap: "pretty",
                }}
              >
                {criterion.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
