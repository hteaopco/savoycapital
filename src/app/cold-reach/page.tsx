import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ColdReach, type Submission } from "@/components/ColdReach";
import { PortalShell } from "@/components/PortalShell";
import { getDb } from "@/lib/db";
import { getViewer, isManagement } from "@/lib/authz";

/**
 * Cold Reach — inbound enquiries from the public contact form (owner,
 * 2026-09-07: "opportunities hit 'Admin' … link under admin for 'Cold Reach'").
 *
 * **This screen is what makes the contact form defensible.** The 2026-09-06
 * build spec argued against a form on the grounds that an unwatched one is
 * worse than none; the form shipped because this exists to watch it. Removing
 * this screen means removing the form.
 *
 * **Authenticated, and management only.** Protection comes from this path being
 * ABSENT from `src/proxy.ts`'s public list — do not add it there. The redirect
 * below is a convenience rather than the control; every route this page calls
 * guards itself, because a page that only hid its own UI would leave the API
 * open to anyone who typed the URL.
 *
 * `force-dynamic` because of the query — without it Next tries to prerender at
 * build time, and CI builds with no `DATABASE_URL` at all.
 */
export const metadata: Metadata = {
  title: "Cold Reach — Savoy Capital",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ColdReachPage() {
  const { viewer } = await getViewer();
  if (!isManagement(viewer)) redirect("/portal/portfolio");

  const db = getDb();

  // `null` means "not configured" and the screen says so. An empty array means
  // "configured, nothing has come in" — a different thing, and conflating them
  // would report an empty inbox on a broken deploy.
  const submissions: Submission[] | null = db
    ? await db.inquiry
        .findMany({
          orderBy: [{ createdAt: "desc" }],
          // Bounded because this is the ONE table strangers can append to.
          // Unbounded, a spam run past the honeypot renders thousands of rows
          // carrying 5,000 characters each and takes the admin screen down
          // exactly when it is needed. Newest first, so what is hidden at 200
          // is the oldest — and delete is right there to work the list down.
          take: 200,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            message: true,
            readAt: true,
            createdAt: true,
            files: {
              select: { id: true, key: true, filename: true, sizeBytes: true },
              orderBy: { id: "asc" },
            },
          },
        })
        .then((rows) =>
          rows.map((r) => ({
            ...r,
            readAt: r.readAt ? r.readAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
          })),
        )
        .catch(() => null)
    : null;

  return (
    <PortalShell title="Cold Reach" isManagement>
      <ColdReach submissions={submissions} />
    </PortalShell>
  );
}
