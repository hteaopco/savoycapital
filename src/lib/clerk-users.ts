import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "./db";

/**
 * Reading the account list out of Clerk.
 *
 * Clerk is the roster (owner, 2026-08-24: *"can we just read users from
 * clerk?"* — yes). This app stores role and fund against a Clerk user id and
 * nothing else about a person; names and phone numbers come from here, live.
 *
 * ## Why not invite from this app
 *
 * Because it does not fit this instance. `clerkClient().invitations
 * .createInvitation()` takes `emailAddress` and has **no phone field** — checked
 * in `@clerk/backend`'s own types, not assumed — and this instance identifies
 * people by phone (`PLAYBOOKS/auth-clerk.md` GOTCHA 9). `users.createUser()`
 * *does* take a phone and would work, but it creates an account outright rather
 * than inviting one, which is a different decision about who may mint an
 * identity and belongs to the Clerk seat.
 *
 * So accounts are still invited from the Clerk Dashboard, and this app assigns
 * what those accounts can see.
 *
 * ## Failure shape
 *
 * `null` when the secret key is absent, matching `getDb()` and `getR2()`: CI
 * builds with no secrets at all, and the screens report "not configured" rather
 * than crashing a page that has nothing to do with Clerk's backend API.
 */

export type ClerkAccount = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  /** Primary phone if there is one. This instance signs people in by phone. */
  phone: string | null;
  email: string | null;
  createdAt: number;
};

/**
 * Every account on the instance.
 *
 * `limit: 100` is a stated ceiling rather than a silent one — the population is
 * two people today and "modestly" more later. Past 100 this needs the
 * `offset` loop, and the screen would rather say so than quietly show a prefix.
 */
export const CLERK_LIST_LIMIT = 100;

export async function listClerkAccounts(): Promise<
  { accounts: ClerkAccount[]; truncated: boolean } | null
> {
  if (!process.env.CLERK_SECRET_KEY) return null;

  const client = await clerkClient();
  const res = await client.users.getUserList({
    limit: CLERK_LIST_LIMIT,
    orderBy: "-created_at",
  });

  const accounts: ClerkAccount[] = res.data.map((u) => {
    // `primaryPhoneNumberId` points into the `phoneNumbers` array; falling back
    // to the first entry covers an account whose primary is not set.
    const primaryPhone =
      u.phoneNumbers.find((p) => p.id === u.primaryPhoneNumberId) ?? u.phoneNumbers[0];
    const primaryEmail =
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: primaryPhone?.phoneNumber ?? null,
      email: primaryEmail?.emailAddress ?? null,
      createdAt: u.createdAt,
    };
  });

  return { accounts, truncated: res.totalCount > accounts.length };
}

/**
 * A display name for an account.
 *
 * Falls back through phone then email then the id, because this instance
 * identifies people by phone and `firstName` is the only reliable display value
 * (GOTCHA 9) — an account can legitimately have neither name set, and showing a
 * blank row would make it look broken rather than incomplete.
 */
export function accountLabel(a: ClerkAccount): string {
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
  return name || a.phone || a.email || a.id;
}

/**
 * Phone numbers for everyone who should be told an enquiry arrived.
 *
 * ## There is no phone number written anywhere in this repository
 *
 * The owner offered to hardcode his (2026-09-07) and then asked the better
 * question — *"or doesn't my clerk account have my number?"* It does, and it
 * cannot not: this instance is configured `identification_strategies:
 * ["phone_number"]` with `email_address: off` (`PLAYBOOKS/auth-clerk.md`
 * GOTCHA 9), so **a phone is how an account signs in.** Every account on the
 * instance has one and it is verified by construction.
 *
 * So the roster IS the recipient list, and that is strictly better than a
 * literal in three ways: nothing personal is committed to git history, adding
 * the second principal is a role assignment rather than a deploy, and a number
 * that changes has to change in Clerk anyway or its owner cannot sign in.
 *
 * ## Who counts as management matches `authz.ts`, including the valve
 *
 * MANAGEMENT assignments, or — while the assignment table is empty and
 * `authz.ts`'s bootstrap valve is treating everyone as management — every
 * account on the instance. Deliberately the same rule in both places: a
 * notification list that disagreed with the authorization list would text
 * somebody about an inbox they cannot open.
 *
 * ## Failure shape
 *
 * `[]` on any problem — no secret key, no database, a Clerk outage. The caller
 * is a best-effort notifier and an empty list simply means nobody is texted.
 * Never throws.
 */
const PHONE_CACHE_MS = 5 * 60 * 1000;
let phoneCache: { at: number; phones: string[] } | null = null;

export async function managementPhones(): Promise<string[]> {
  // Cached because the trigger is a public endpoint: without this, a spam run
  // past the honeypot is also a Clerk API call per submission. Five minutes is
  // short enough that a role change takes effect while someone is still
  // wondering whether it did.
  if (phoneCache && Date.now() - phoneCache.at < PHONE_CACHE_MS) return phoneCache.phones;

  let phones: string[] = [];
  try {
    const roster = await listClerkAccounts();
    if (roster) {
      const db = getDb();
      const assignments = db
        ? await db.userRole.findMany({ select: { clerkUserId: true, role: true } })
        : [];

      const wanted = assignments.length
        ? new Set(
            assignments.filter((a) => a.role === "MANAGEMENT").map((a) => a.clerkUserId),
          )
        : // The valve is holding: no assignments exist, so everyone signed in
          // is management and everyone gets told. Two accounts today.
          null;

      phones = roster.accounts
        .filter((a) => wanted === null || wanted.has(a.id))
        .map((a) => a.phone)
        .filter((p): p is string => Boolean(p));
    }
  } catch {
    phones = [];
  }

  phoneCache = { at: Date.now(), phones };
  return phones;
}
