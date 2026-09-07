/**
 * Firm facts and positioning copy for the PUBLIC landing page.
 *
 * Same rule as `investments.ts`: everything here is readable by anyone on the
 * internet. **No performance figures — no target returns, no IRR, no MOIC, no
 * fund terms, no "invest with us" language.** That is a legal constraint, not a
 * style preference (owner's build spec, 2026-09-06; `FACTS.md` § "securities
 * marketing" is the standing reason and is still open pending counsel).
 *
 * Copy lives here rather than in the components because it is the part that
 * gets edited — by a person, repeatedly, and eventually by counsel. A component
 * holding its own prose means a copy change is a code review.
 */

/** Where the firm is. Shown in "At a glance" and in the contact block. */
export const HEADQUARTERS = "Lafayette, LA";

/**
 * The firm's address.
 *
 * **Not rendered on the site any more.** The public page's `mailto:` became a
 * form on 2026-09-07 and enquiries land in the portal under Cold Reach, so
 * nothing displays this today.
 *
 * It is kept because it is the fact, and because it is the recipient the
 * Resend notification will need when that lands (owner, 2026-09-07: "we can
 * wire in resend email and also clicksend text coming up"). If that never
 * happens, delete it rather than leaving a constant nothing reads.
 */
export const CONTACT_EMAIL = "jett@evolamco.com";

/**
 * The thesis statement, shown once directly under the hero.
 *
 * This is the page's positioning and the sentence the whole revision was built
 * around. It says what Savoy invests in and what it brings; it does not say how
 * anything has performed or invite anyone to invest.
 */
export const APPROACH =
  "Savoy Capital makes control, minority, and passive investments across private equity, private credit, and real estate. We underwrite the operator before the asset. Businesses are run by people, and we have run them ourselves — which means we understand the seat you're sitting in.";

export type Criterion = {
  label: string;
  body: string;
};

/**
 * What the firm looks for, by asset class. Four of them as of 2026-09-07,
 * ordered early-stage to hard-asset, which is how the columns read left to
 * right.
 *
 * The highest-value block on the page for inbound deal flow — brokers screen on
 * criteria before anything else. **Keep each to a short paragraph.** The full
 * criteria from the internal deck do not belong on a public page, and the spec
 * says so explicitly.
 *
 * Note what these are and are not: ranges that describe the kind of business
 * Savoy will look at ($500K–$3M EBITDA, $5M+ project size, 12–48 month terms).
 * Those are screening criteria, not returns or terms of an offering.
 */
export const CRITERIA: Criterion[] = [
  {
    label: "Private Equity",
    body: "Control, significant minority, and passive positions in founder-led businesses with $500K–$5M EBITDA. Demonstrated operating history and financial visibility.",
  },
  {
    label: "Private Credit",
    body: "Senior secured and structured lending to operating businesses. Asset-backed with a strong collateral profile, defined maturities, and terms from 12 to 48 months.",
  },
  {
    label: "Venture Capital",
    body: "Selective minority positions in companies between Series A and Series B. Founders with direct subject-matter expertise, demonstrated traction, and a disciplined capital structure. Capital deployed in stages, sized relative to risk.",
  },
  {
    label: "Real Estate",
    body: "Opportunistic equity in operator-led transactions, $5M+ total project size, with meaningful sponsor co-investment and conservative leverage.",
  },
];

/**
 * The legal line, set small and quiet at the bottom of the footer.
 *
 * **This is the conservative posture the spec was written to, not a legal
 * opinion.** `FACTS.md` § "securities marketing" is still open: counsel has not
 * read this page. The line below disclaims an offer; it does not substitute for
 * the review. Do not treat its presence as clearance, and do not extend it into
 * anything resembling offering language.
 */
export const LEGAL_LINE =
  "This website is for informational purposes only. It is not an offer to sell or a solicitation of an offer to buy any security.";
