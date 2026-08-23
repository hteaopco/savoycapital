import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Authorization for the private surface.
 *
 * Clerk's middleware answers one question: "is this a signed-in Clerk user?"
 * That is AUTHENTICATION, and on its own it is not the boundary this product
 * needs. Whether a stranger may create an account is a setting in the Clerk
 * Dashboard — not a fact anyone can check by reading this repo — so code that
 * treats "signed in" as "allowed in" is only ever as closed as a checkbox no
 * reviewer here can see.
 *
 * `.claudet/DECISIONS.md` is explicit that two users is an argument against
 * tenancy machinery and never against an auth boundary. This module is that
 * boundary: an explicit allowlist of the people who may see the portfolio
 * monitor, checked on the server on every request to the private surface.
 */

/** The env var holding the allowlist. Named here so refusal copy can cite it. */
export const ALLOWLIST_ENV_VAR = "SAVOY_ALLOWED_EMAILS";

/**
 * The parsed allowlist: comma-separated addresses, case-folded, blanks dropped.
 * An empty result means nothing is allowed — see `checkAccess` for why that is
 * the deliberate answer rather than the opposite one.
 */
export function allowedEmails(): string[] {
  return (process.env[ALLOWLIST_ENV_VAR] ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export type AccessCheck =
  | { allowed: true; email: string; greeting: string }
  | {
      allowed: false;
      /**
       * `unconfigured` — no allowlist is set, so no one can be on it.
       * `not-allowlisted` — a real signed-in user who is not one of the two.
       * They are told apart because they need different fixes, and showing an
       * owner "you are not authorized" when the truth is "nobody set the
       * variable" would send them hunting in the wrong place.
       */
      reason: "unconfigured" | "not-allowlisted";
      email: string | null;
    };

/**
 * Wrapped in React's `cache()` so the private layout and the page it renders
 * share one answer. Clerk's `currentUser()` is NOT request-cached — it calls
 * the Clerk backend every time — so without this, each protected page load
 * costs two round-trips to answer the same question twice.
 */
export const checkAccess = cache(async (): Promise<AccessCheck> => {
  const user = await currentUser();

  // Every VERIFIED address on the account, not just the primary one. Matching
  // the primary alone would lock out an owner who later adds an address and
  // promotes it; accepting unverified ones would let anybody claim an
  // allowlisted address they do not control.
  const emails = (user?.emailAddresses ?? [])
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress.toLowerCase());

  const allowed = allowedEmails();

  // FAIL CLOSED. An unset allowlist locks out everyone, the owners included,
  // and that is the intended behaviour: the alternative — reading "unset" as
  // "let any signed-in user through" — turns one forgotten deploy variable
  // into an open door onto the fund's positions. The two failures are not
  // equally bad, so this picks the recoverable one, and the refusal names the
  // variable so the fix is one deploy setting away rather than a debugging
  // session.
  if (allowed.length === 0) {
    return { allowed: false, reason: "unconfigured", email: emails[0] ?? null };
  }

  const match = emails.find((email) => allowed.includes(email));
  if (!match) {
    return { allowed: false, reason: "not-allowlisted", email: emails[0] ?? null };
  }

  return {
    allowed: true,
    email: match,
    greeting: user?.firstName?.trim() || match,
  };
});
