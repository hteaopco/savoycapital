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
 *
 * Shortened 2026-10-10 (owner's wording). It was three sentences; the last two
 * — "We underwrite the operator before the asset" and a longer line about
 * having run businesses — collapsed into one, with the colon carrying what
 * "because our core belief is to invest in" was doing.
 *
 * **Lowercase "operator", deliberately.** `investments.ts` capitalises "the
 * Operator" once, and that is correct there: it names a specific counterparty
 * in a specific deal, the way a credit agreement would. Here it is the role in
 * general prose, matching the other lowercase use in this file eight lines
 * down ("operator-led transactions"). Capitalising it would make this file
 * disagree with itself on one page.
 */
export const APPROACH =
  "Savoy Capital makes control, minority, and passive investments across private equity, private credit, and real estate. We underwrite the operator before the asset: great people first, great businesses second.";

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
