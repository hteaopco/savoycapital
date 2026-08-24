import type { Metadata } from "next";
import { C } from "@/components/palette";
import {
  FundUsers as FundUsersScreen,
  type Fund,
  type RosterUser,
} from "@/components/FundUsers";
import { PortalShell } from "@/components/PortalShell";
import { getDb } from "@/lib/db";

/**
 * Fund & Users — the second screen under Admin (owner, 2026-08-24).
 *
 * Both lists load HERE, on the server, and go down as props. Same reason as the
 * Deal Room: React 19's `react-hooks/set-state-in-effect` rejects a mount effect
 * that sets state, and loading on the server removes the effect, the loading
 * state and a round trip at once.
 *
 * `force-dynamic` because of those queries — without it Next tries to prerender
 * at build time, and CI builds with no `DATABASE_URL` at all.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there — this page serves people's phone numbers.
 *
 * **It does not grant anything.** The rows it creates are records. Access is
 * still Clerk's restricted sign-up plus an invitation from the Dashboard; see
 * `PLAYBOOKS/fund-users.md`.
 */
export const metadata: Metadata = {
  title: "Fund & Users — Savoy Capital",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FundUsersPage() {
  const db = getDb();

  // `null` means "not configured", which the screen reports as such. Empty
  // arrays mean "configured, nothing yet" — a different thing, and conflating
  // them would show "create your first fund" on a broken deploy.
  const [initialFunds, initialUsers]: [Fund[] | null, RosterUser[] | null] = db
    ? await Promise.all([
        db.fund
          .findMany({
            orderBy: { id: "asc" },
            include: { _count: { select: { users: true, deals: true } } },
          })
          .then((rows) =>
            rows.map((f) => ({
              id: f.id,
              name: f.name,
              // Date only. `@db.Date` arrives as a Date at UTC midnight;
              // slicing the ISO string keeps the calendar day that was entered,
              // which `toLocaleDateString` would shift westward.
              inceptionDate: f.inceptionDate
                ? f.inceptionDate.toISOString().slice(0, 10)
                : null,
              userCount: f._count.users,
              dealCount: f._count.deals,
            })),
          ),
        db.user
          .findMany({
            orderBy: [{ fundId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
            include: { fund: { select: { name: true } } },
          })
          .then((rows) =>
            rows.map((u) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              phone: u.phone,
              role: u.role,
              fundId: u.fundId,
              fundName: u.fund.name,
            })),
          ),
      ])
    : [null, null];

  return (
    <PortalShell title="Fund & Users">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Fund &amp; Users</div>
          <FundUsersScreen initialFunds={initialFunds} initialUsers={initialUsers} />
        </div>
      </div>
    </PortalShell>
  );
}
