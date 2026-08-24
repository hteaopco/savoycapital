import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { C } from "@/components/palette";
import { DealRoom as DealRoomScreen, type Deal } from "@/components/DealRoom";
import { PortalShell } from "@/components/PortalShell";
import { DEFAULT_FUND_ID, getDb } from "@/lib/db";
import { getViewer, isManagement } from "@/lib/authz";

/**
 * Deal Room — the one screen under the nav's Admin section (owner, 2026-08-24).
 * Create a deal, then upload its documents.
 *
 * **The deal list is loaded HERE, on the server, and handed down as a prop.**
 * The obvious alternative — a client component fetching `/api/deals` from a
 * mount effect — is what this started as, and React 19's
 * `react-hooks/set-state-in-effect` rule rejects it: a state update driven by an
 * effect on mount causes a cascading render. Loading on the server removes the
 * effect, the loading state and a round trip all at once. The client component
 * still fetches, but only from real user actions — create, open, upload — which
 * are event handlers, not effects.
 *
 * `force-dynamic` because of that query. Without it Next would try to prerender
 * this page at build time, and CI builds with **no `DATABASE_URL` at all**.
 *
 * Deal names and descriptions live in Postgres; bytes live in R2. See
 * `PLAYBOOKS/deal-room.md` for how the two halves fit and which one is written
 * first.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there. It matters more here than on the other
 * screens: a deal room is where unannounced transactions would live.
 */
export const metadata: Metadata = {
  title: "Deal Room — Savoy Capital",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DealRoomPage() {
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

  // `null` means "not configured", which the screen reports as such. An empty
  // array means "configured, no deals yet" — a different thing, and conflating
  // the two would show "create your first deal" on a broken deploy.
  const initialDeals: Deal[] | null = db
    ? (
        await db.deal.findMany({
          where: { fundId: DEFAULT_FUND_ID },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { documents: true } } },
        })
      ).map((d) => ({
        id: d.id,
        fundId: d.fundId,
        name: d.name,
        createdAt: d.createdAt.toISOString(),
        documentCount: d._count.documents,
      }))
    : null;

  return (
    <PortalShell title="Deal Room" isManagement>
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Deal Room</div>
          <DealRoomScreen initialDeals={initialDeals} />
        </div>
      </div>
    </PortalShell>
  );
}
