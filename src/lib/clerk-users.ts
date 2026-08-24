import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

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
