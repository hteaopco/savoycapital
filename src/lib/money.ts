/**
 * Dollars in, cents stored, dollars out.
 *
 * `FACTS.md`: money is integer cents end to end. People type dollars, so
 * exactly one place converts, and it is this file — a second parser written at
 * a call site is how "1,500,000" and "1500000" end up meaning different things
 * on two screens.
 *
 * Not `server-only`: the same parsing runs in the browser to validate what was
 * typed before it is sent, and re-runs on the server because a client-side
 * check is a convenience and never the guard.
 */

/**
 * Parse a typed dollar amount into integer cents.
 *
 * Accepts what a person actually types — `$1,500,000`, `1500000`, `1,500,000.50`
 * — and rejects the rest. Returns `null` for anything it cannot read, so the
 * caller decides whether that is an error or an empty field. **Never guesses:**
 * a half-parsed money figure is worse than a refused one.
 *
 * Rounds to the nearest cent rather than truncating. `12.345` is a typo either
 * way, but rounding loses less than flooring and does not silently shrink an
 * amount.
 */
export function parseDollarsToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  // One optional decimal point, digits either side. No exponent, no sign — a
  // negative investment is not a thing this app should accept by accident.
  if (!/^\d+(\.\d{1,})?$/.test(cleaned)) return null;
  const asNumber = Number(cleaned);
  if (!Number.isFinite(asNumber)) return null;
  const cents = Math.round(asNumber * 100);
  // Beyond this, cents stop being exact as a JS number. It is about $90
  // trillion, so the check is a guard rail rather than a real limit — but an
  // inexact money figure should fail loudly rather than round itself.
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

/**
 * Cents to a dollar string for an input's value — `1,500,000` (owner,
 * 2026-08-24: "use the comma separator..IE instead of 10000000 make it
 * 10,000,000").
 *
 * **Grouped, but no currency symbol**: this feeds a field whose label already
 * says what it is, and a `$` inside the box is a character the person has to
 * step over to edit the first digit.
 *
 * The commas are applied when a value LOADS and again on blur — never on every
 * keystroke. Reformatting mid-word moves the caret, so typing `10000000` with
 * live grouping lands the cursor somewhere the typist did not put it. Callers
 * use `groupDollarInput` for the blur pass.
 */
export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const whole = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const grouped = whole.toLocaleString("en-US");
  return remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, "0")}`;
}

/**
 * Re-group what somebody typed, for an input's `onBlur`.
 *
 * Returns the input unchanged when it does not parse, so a half-typed or
 * invalid figure is left exactly as entered for them to fix — silently
 * rewriting or blanking a field somebody is still working on is worse than
 * leaving it alone, and the save path rejects it anyway with a message.
 */
export function groupDollarInput(raw: string): string {
  const cents = parseDollarsToCents(raw);
  return cents === null ? raw : centsToDollarInput(cents);
}

/** Cents to a display string — `$1,500,000`. Whole dollars; funds are not priced in pennies. */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * A `@db.Date` column arrives as a `Date` at UTC midnight. `toLocaleDateString`
 * renders that as the previous day anywhere west of UTC, so every date on this
 * product goes through here instead.
 */
export function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/**
 * `YYYY-MM-DD` from an `<input type="date">` to a `Date` at UTC midnight.
 *
 * Returns `undefined` for an empty string — "not supplied" rather than an
 * error, because these columns are nullable on purpose — and `null` for a
 * string that is not a date, which the caller should reject.
 */
export function parseDateInput(raw: string): Date | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
