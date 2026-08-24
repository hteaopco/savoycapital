import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { listClerkAccounts } from "@/lib/clerk-users";

/**
 * The people list — **Clerk's accounts**, joined to this app's role assignments.
 *
 * `GET` → every Clerk account, each with its assigned fund and role, or `null`
 * for both when nothing has been assigned yet.
 *
 * ## Clerk is the roster, and that is the point of this route
 *
 * There is no create here. An account comes into existence in the Clerk
 * Dashboard, because the instance is set to restricted sign-up and that is the
 * access boundary (`PLAYBOOKS/auth-clerk.md` § 1). Inviting from this app was
 * considered and does not fit: `createInvitation` requires an email address and
 * has no phone field, and this instance identifies people by phone.
 *
 * What this app owns is the two facts Clerk has no opinion about — which fund,
 * and what role — and those live in `UserRole`, keyed by Clerk user id.
 *
 * **Nothing enforces the role yet.** Assignments are being collected first, on
 * purpose, so that the enforcement change lands against data that already
 * exists rather than locking somebody out of a portal nobody can reach.
 *
 * Protected by absence from `src/proxy.ts`'s public list, with an explicit
 * `auth()` here because this returns people's phone numbers.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const directory = await listClerkAccounts();

  // The two halves fail independently and the screen distinguishes them: a
  // missing CLERK_SECRET_KEY means no account list at all, a missing
  // DATABASE_URL means accounts with no assignments. Collapsing both into one
  // error would send someone to check the wrong variable.
  if (!directory) {
    return NextResponse.json(
      { error: "Clerk's backend API is not configured. Set CLERK_SECRET_KEY." },
      { status: 503 },
    );
  }
  if (!db) {
    return NextResponse.json(
      { error: "The database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const assignments = await db.userRole.findMany({
    include: { fund: { select: { id: true, name: true } } },
  });
  const byClerkId = new Map(assignments.map((a) => [a.clerkUserId, a]));

  return NextResponse.json({
    truncated: directory.truncated,
    people: directory.accounts.map((a) => {
      const assigned = byClerkId.get(a.id);
      return {
        clerkUserId: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        phone: a.phone,
        email: a.email,
        role: assigned?.role ?? null,
        fundId: assigned?.fundId ?? null,
        fundName: assigned?.fund.name ?? null,
      };
    }),
  });
}
