import { C } from "./palette";
import { heroLead, eyebrow } from "./type";
import {
  APPROACH,
  CONTACT_EMAIL,
  CRITERIA,
  CRITERIA_CLOSER,
  HEADQUARTERS,
} from "@/content/site";

/**
 * The landing page's copy sections: Approach, At a glance, What we look for,
 * and Contact.
 *
 * Four small server components in one file because they are one thing — the
 * body of a single page, sharing a measure, a rhythm and a left edge. Splitting
 * them into four files would spread that agreement across four places where it
 * can drift, and none of them is reused anywhere else. The hero, the portfolio
 * grid and the footer are separate files because each is genuinely its own
 * problem.
 *
 * Everything here is `DESIGN_SYSTEM.md` § 0.5's rule applied literally: the
 * only chrome in the whole file is two hairlines, and both separate different
 * *kinds* of statement rather than decorating a block.
 */

/** The shared column. Every section sits on the same left edge as the hero. */
const COLUMN = "mx-auto max-w-[1120px] px-5 md:px-10";

/**
 * The thesis statement.
 *
 * No heading and no eyebrow, deliberately: a label above it would make it a
 * section, and it is meant to read as the page speaking rather than as a block
 * of content. Set above body size for the same reason — this is the sentence
 * the revision was built around, and generous padding is what makes it a pause
 * rather than a caption.
 */
export function SiteApproach() {
  return (
    <div style={{ background: C.bgAlt }}>
      <div className={`${COLUMN} py-16 md:py-24`}>
        <p
          className="max-w-[600px]"
          style={{ ...heroLead, color: C.text, textWrap: "pretty" }}
        >
          {APPROACH}
        </p>
      </div>
    </div>
  );
}

/**
 * Three facts in a row.
 *
 * Not a middle-dot-joined string and not three cards: three discrete blocks
 * with one hairline above the row and nothing else (spec). No icons, no
 * borders — whitespace does the separating, which is § 0.5 again.
 *
 * **"Committed capital" is the label, and the wording is load-bearing.** Not
 * "assets under management", not "fund size", not "capital raised": those are
 * different claims about a fund, and two of them are the kind of claim
 * `FACTS.md` § "securities marketing" gates.
 *
 * `committedCapital` is already formatted by the caller and may be `null` — the
 * block is then omitted entirely rather than showing a placeholder or a stale
 * literal. See `loadCommittedCapitalCents` for why that is the right failure.
 */
export function AtAGlance({
  committedCapital,
  investmentCount,
}: {
  committedCapital: string | null;
  investmentCount: number;
}) {
  const facts = [
    ...(committedCapital
      ? [{ value: committedCapital, label: "Committed capital" }]
      : []),
    { value: String(investmentCount), label: "Current investments" },
    { value: HEADQUARTERS, label: "Headquarters" },
  ];

  return (
    <div style={{ background: C.bg }}>
      <div className={`${COLUMN} py-16 md:py-20`}>
        <div
          className="flex flex-col gap-10 pt-10 md:flex-row md:gap-20"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-2">
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  color: C.text,
                  // Every value in this row is read as a figure, including the
                  // city — lining them up is what makes them read as a set.
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fact.value}
              </div>
              <div style={{ ...eyebrow, color: C.textDim }}>{fact.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

        {/* Set apart on a rule: it closes the section rather than belonging to
            the third column, and without the rule it reads as Real Estate's
            last line. */}
        <div
          className="mt-12 pt-8"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: C.text,
            }}
          >
            {CRITERIA_CLOSER}
          </p>
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
