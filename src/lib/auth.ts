import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Authorization for the private surface.
 *
 * Clerk's proxy answers one question: "is this a signed-in Clerk user?" That is
 * AUTHENTICATION, and on its own it is not the boundary this product needs.
 * Whether a stranger may create an account is a setting in the Clerk Dashboard
 * — and on this instance it was, at first setup, **public** — so code that
 * treats "signed in" as "allowed in" is only ever as closed as a checkbox no
 * reviewer here can see.
 *
 * `.claudet/DECISIONS.md` is explicit that two users is an argument against
 * tenancy machinery and never against an auth boundary. This module is that
 * boundary: an explicit allowlist of the people who may see the portfolio
 * monitor, checked on the server on every request to the private surface.
 *
 * **It matches PHONE NUMBERS, not emails.** The Clerk instance identifies users
 * by phone (`identification_strategies: ["phone_number"]`, email off), so there
 * is no verified email to match on — an email allowlist here would reject the
 * principals along with everyone else. See PLAYBOOKS/auth-clerk.md GOTCHA 9.
 */

/** The env var holding the allowlist. Named here so refusal copy can cite it. */
export const ALLOWLIST_ENV_VAR = "SAVOY_ALLOWED_PHONES";

/**
 * Reduce a phone number to comparable digits.
 *
 * Clerk stores E.164 (`+15551234567`); a human setting the env var may type
 * `+1 (555) 123-4567`. Stripping every non-digit makes those equal without
 * loosening the comparison itself — the match below is still exact.
 *
 * Note this drops the leading `+`, so the country code is still REQUIRED for a
 * match: bare `5551234567` will not equal `15551234567`. That is deliberate.
 * Treating a 10-digit number as implicitly US would make the allowlist guess at
 * identity, and a guess is not what should stand between the public and the
 * fund's positions. `describeNormalized` exists to make that failure legible
 * rather than mysterious.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** The parsed allowlist: comma-separated numbers, normalized, blanks dropped. */
export function allowedPhones(): string[] {
  return (process.env[ALLOWLIST_ENV_VAR] ?? "")
    .split(",")
    .map((entry) => normalizePhone(entry))
    .filter((entry) => entry.length > 0);
}

/**
 * True when an allowlist entry looks like it is missing a country code — the
 * one formatting mistake that silently locks a real person out. Used only for
 * diagnostics; it never widens a match.
 */
export function looksMissingCountryCode(normalized: string): boolean {
  return normalized.length === 10;
}

export type AccessCheck =
  | { allowed: true; phone: string; greeting: string }
  | {
      allowed: false;
      /**
       * `unconfigured`     — no allowlist is set, so no one can be on it.
       * `no-verified-phone`— signed in, but the account carries no verified
       *                      phone to match. Usually means the Clerk instance
       *                      is not collecting the identifier this allowlist
       *                      reads, which is a configuration bug, not a
       *                      trespasser.
       * `not-allowlisted`  — a real signed-in user who is not one of ours.
       *
       * They are told apart because they need different fixes, and telling an
       * owner "you are not authorized" when the truth is "nobody set the
       * variable" would send them hunting in the wrong place.
       */
      reason: "unconfigured" | "no-verified-phone" | "not-allowlisted";
      phone: string | null;
      /** Set when the allowlist itself looks malformed. Operator hint only. */
      hint?: string;
    };

/**
 * Wrapped in React's `cache()` so the private layout and the page it renders
 * share one answer. Clerk's `currentUser()` is NOT request-cached — it calls
 * the Clerk backend every time — so without this, each protected page load
 * costs two round-trips to answer the same question twice.
 */
export const checkAccess = cache(async (): Promise<AccessCheck> => {
  const user = await currentUser();

  // Every VERIFIED number on the account. Unverified ones are excluded: anyone
  // can type a number they do not control, and an allowlist that trusts an
  // unverified claim is not an allowlist.
  const phones = (user?.phoneNumbers ?? [])
    .filter((entry) => entry.verification?.status === "verified")
    .map((entry) => normalizePhone(entry.phoneNumber));

  const allowed = allowedPhones();

  // FAIL CLOSED. An unset allowlist locks out everyone, the owners included,
  // and that is the intended behaviour: the alternative — reading "unset" as
  // "let any signed-in user through" — turns one forgotten deploy variable
  // into an open door onto the fund's positions. The two failures are not
  // equally bad, so this picks the recoverable one, and the refusal names the
  // variable so the fix is one deploy setting away rather than a debugging
  // session.
  if (allowed.length === 0) {
    return { allowed: false, reason: "unconfigured", phone: phones[0] ?? null };
  }

  if (phones.length === 0) {
    return { allowed: false, reason: "no-verified-phone", phone: null };
  }

  const match = phones.find((phone) => allowed.includes(phone));
  if (!match) {
    return {
      allowed: false,
      reason: "not-allowlisted",
      phone: phones[0],
      hint: allowed.some(looksMissingCountryCode)
        ? `An entry in ${ALLOWLIST_ENV_VAR} is 10 digits and is probably missing its country code.`
        : undefined,
    };
  }

  return {
    allowed: true,
    phone: match,
    greeting: user?.firstName?.trim() || match,
  };
});
