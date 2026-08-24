/**
 * The date of the marks shown on the Portfolio card.
 *
 * **This is all that is left here.** The fund size and every holding used to
 * live in this file, and Portfolio rendered them — which meant editing a fund's
 * size under Fund & Users changed nothing on the chart. The owner hit exactly
 * that on 2026-08-24 ("it did not change the fund size when i changed it here")
 * and the fix was to read both from Postgres: `Fund.sizeCents` and each
 * `Deal.amountCents`. `src/lib/portfolio.ts` builds the chart now.
 *
 * The as-of date stays a literal because there is nothing in the schema it
 * could honestly come from. It is the date of the MARKS, and there are no marks
 * — positions and valuations are still the decision `STATE.md` records as
 * blocked on a person. `Fund.inceptionDate` means something else and the latest
 * investment date means something else again; using either would put a number
 * on screen under a label it does not answer.
 */

/** Date of the marks shown, ISO `YYYY-MM-DD`. */
export const FUND_AS_OF = "2026-08-23";
