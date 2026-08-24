import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { C } from "@/components/palette";
import { FundUsers as FundUsersScreen, type Person } from "@/components/FundUsers";
import { CLERK_LIST_LIMIT, listClerkAccounts } from "@/lib/clerk-users";
import { PortalShell } from "@/components/PortalShell";
import { getDb } from "@/lib/db";
import { getViewer, isManagement } from "@/lib/authz";

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
  // MANAGEMENT ONLY (owner, 2026-08-24). An investor is redirected rather than
  // shown an empty shell: a screen that renders its chrome and nothing else
  // reads as broken, and this one is where unannounced transactions live.
  //
  // The redirect is a convenience, NOT the control. Every route this page calls
  // guards itself — a page that only hid its own UI would leave the API open to
  // anyone who typed the URL.
  const { viewer } = await getViewer();
  if (!isManagement(viewer)) redirect("/portal/portfolio");

  const db = getDb();

  // `null` means "not configured", which the screen reports as such. Empty
  // arrays mean "configured, nothing yet" — a different thing, and conflating
  // them would show "create your first fund" on a broken deploy.
  // Clerk is the roster; this app supplies only role and fund. The two halves
  // fail independently and the screen distinguishes them, because a missing
  // CLERK_SECRET_KEY and a missing DATABASE_URL send you to different variables.
  const [directory, initialFunds, assignments] = await Promise.all([
    listClerkAccounts(),
    db
      ? db.fund
          .findMany({
            orderBy: { id: "asc" },
            include: { _count: { select: { roles: true, deals: true } } },
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
              assignedCount: f._count.roles,
              dealCount: f._count.deals,
            })),
          )
      : Promise.resolve(null),
    db
      ? db.userRole.findMany({ include: { fund: { select: { name: true } } } })
      : Promise.resolve(null),
  ]);

  const byClerkId = new Map((assignments ?? []).map((a) => [a.clerkUserId, a]));

  const initialPeople: Person[] | null = directory
    ? directory.accounts.map((a) => {
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
      })
    : null;

  return (
    <PortalShell title="Fund & Users" isManagement>
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Fund &amp; Users</div>
          <FundUsersScreen
            initialFunds={initialFunds}
            initialPeople={initialPeople}
            truncated={directory?.truncated ?? false}
            listLimit={CLERK_LIST_LIMIT}
          />
        </div>
      </div>
    </PortalShell>
  );
}
