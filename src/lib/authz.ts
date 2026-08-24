import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "./db";

/**
 * Who is asking, and what they may see.
 *
 * This is the authorization layer `src/proxy.ts` deliberately does not have.
 * The proxy asks one question — is somebody signed in — and that was the whole
 * test while the population was two people who both see everything. It is not
 * any more.
 *
 * ## Why this is not in the proxy
 *
 * `src/proxy.ts` runs as Next middleware, on the edge runtime, where Prisma's
 * pg driver adapter cannot go. It also belongs to the Clerk seat. So the
 * boundary stays where it is — "is somebody signed in" — and *what* they may
 * see is decided here, in pages and route handlers, which run on Node and can
 * read the database.
 *
 * That split is also the right shape regardless of runtime: middleware deciding
 * data-dependent authorization means every route's rules live somewhere the
 * route cannot see.
 *
 * ## The bootstrap valve, and why it is not a hole
 *
 * **With ZERO assignments in the database, everyone signed in is treated as
 * management.** Without that, the first deploy of this file would lock the
 * portal's owners out of their own portal — a fail-closed check against an
 * empty table denies everybody — and nothing in this repo can reach Railway's
 * Postgres to undo it.
 *
 * It is not a standing hole, because it closes the moment a single assignment
 * exists, which it does: two were made before this shipped. The state is
 * surfaced on screen rather than left silent, so "why can everyone see
 * everything" has a visible answer.
 *
 * Once any assignment exists, **a signed-in account with no assignment gets
 * nothing.** That is the fail-closed direction, and it is the one that matters:
 * an account invited from the Clerk Dashboard and never assigned should not
 * inherit the fund's numbers by default.
 */

export type Role = "MANAGEMENT" | "INVESTOR";

export type Viewer =
  | { kind: "management"; clerkUserId: string; fundId: number | null }
  | { kind: "investor"; clerkUserId: string; fundId: number }
  /** Signed in, assignments exist, none is theirs. Sees nothing. */
  | { kind: "unassigned"; clerkUserId: string }
  /** Not signed in. The proxy normally prevents this from being reached. */
  | { kind: "anonymous" }
  /** No database. Distinct from `unassigned`: a broken deploy, not a denial. */
  | { kind: "unconfigured"; clerkUserId: string };

/** True while the roster is empty and the bootstrap valve is holding it open. */
export type ViewerResult = { viewer: Viewer; bootstrapping: boolean };

export async function getViewer(): Promise<ViewerResult> {
  const { userId } = await auth();
  if (!userId) return { viewer: { kind: "anonymous" }, bootstrapping: false };

  const db = getDb();
  if (!db) {
    return { viewer: { kind: "unconfigured", clerkUserId: userId }, bootstrapping: false };
  }

  // One query for the caller's own row, one count for the valve. The count is
  // what distinguishes "nobody has been assigned yet" from "you specifically
  // have not been" — collapsing them would either lock everyone out on the
  // first deploy or let an unassigned account in forever.
  const [assignment, total] = await Promise.all([
    db.userRole.findUnique({ where: { clerkUserId: userId } }),
    db.userRole.count(),
  ]);

  if (assignment) {
    return {
      viewer:
        assignment.role === "MANAGEMENT"
          ? { kind: "management", clerkUserId: userId, fundId: assignment.fundId }
          : { kind: "investor", clerkUserId: userId, fundId: assignment.fundId },
      bootstrapping: false,
    };
  }

  if (total === 0) {
    return {
      viewer: { kind: "management", clerkUserId: userId, fundId: null },
      bootstrapping: true,
    };
  }

  return { viewer: { kind: "unassigned", clerkUserId: userId }, bootstrapping: false };
}

/** Management, or the bootstrap valve standing in for it. */
export function isManagement(v: Viewer): v is Extract<Viewer, { kind: "management" }> {
  return v.kind === "management";
}

/**
 * May this viewer see fund `fundId`'s portfolio?
 *
 * Management sees every fund. An investor sees exactly theirs — the agreed
 * scope (owner, 2026-08-24): investor-facing documents for their fund, plus
 * that fund's portfolio. Not the Deal Room, not management-facing files, and
 * not another fund.
 */
export function canSeeFund(v: Viewer, fundId: number): boolean {
  if (v.kind === "management") return true;
  if (v.kind === "investor") return v.fundId === fundId;
  return false;
}

/**
 * The 403 body, shared so every route says the same thing.
 *
 * It names the state rather than the rule. "You do not have a role assigned"
 * is actionable — somebody can go assign one. "Forbidden" sends the reader to
 * ask what they did wrong.
 */
export function forbiddenMessage(v: Viewer): string {
  if (v.kind === "unassigned") {
    return "Your account has no role assigned yet. Ask management to assign one under Fund & Users.";
  }
  if (v.kind === "unconfigured") {
    return "The database is not configured, so permissions cannot be read. Set DATABASE_URL.";
  }
  return "This is management only.";
}
