import { C } from "./palette";
import { eyebrow } from "./type";
import { CONTACT_EMAIL, CRITERIA, HEADQUARTERS } from "@/content/site";

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

        <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-3 md:gap-12">
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
 * A `mailto:` and a city line. **No form** (spec): a form implies an inbox
 * someone is watching, and an unanswered form is worse than none. No phone
 * number, because none is confirmed.
 *
 * No language inviting investment inquiries — that is the securities line, and
 * "get in touch" is on the correct side of it while anything about investing
 * with the firm is not.
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

        <p
          className="mt-4 max-w-[520px]"
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

        <div className="mt-8 flex flex-col gap-2">
          {/* 44px on touch, the page's own density from md up — the pattern
              `SiteNav` and `FundAllocation` already run on. */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center self-start min-h-[44px] md:min-h-0"
            style={{
              fontSize: 19,
              fontWeight: 600,
              color: C.accent,
              textDecoration: "none",
            }}
          >
            {CONTACT_EMAIL}
          </a>
          <div style={{ fontSize: 13, color: C.textMuted }}>{HEADQUARTERS}</div>
        </div>
      </div>
    </div>
  );
}
