import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * Assign or clear one Clerk account's role and fund.
 *
 * `PUT`    → `{ role, fundId }`, upserted on `clerkUserId`.
 * `DELETE` → removes the assignment. The account keeps its Clerk access.
 *
 * ## What this does and does not change
 *
 * It writes a row this app reads. **It does not touch Clerk**, so it cannot
 * grant or revoke sign-in — that is still the Dashboard's, via restricted
 * sign-up. And nothing enforces the role yet: this change collects assignments
 * so the enforcement change has data to land against.
 *
 * Upsert rather than create-or-update by hand: reassigning somebody is the
 * normal operation here, not the exception, and two round trips leave a window
 * where a concurrent write wins and is then overwritten anyway.
 */

export const dynamic = "force-dynamic";

const ROLES = ["MANAGEMENT", "INVESTOR"] as const;
type Role = (typeof ROLES)[number];

type Params = { params: Promise<{ clerkUserId: string }> };

function unconfigured() {
  return NextResponse.json(
    { error: "The database is not configured. Set DATABASE_URL." },
    { status: 503 },
  );
}

/**
 * Clerk user ids look like `user_2abc...`. Validated because it arrives from
 * the URL: without it any string becomes a row, and the table quietly fills
 * with assignments that match no account and will never be read.
 */
function validClerkId(id: string): boolean {
  return /^user_[A-Za-z0-9]{10,}$/.test(id);
}

export async function PUT(request: Request, { params }: Params) {
  const { viewer } = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.kind === "unconfigured") {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 503 });
  }
  if (!isManagement(viewer)) {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 403 });
  }

  const db = getDb();
  if (!db) return unconfigured();

  const { clerkUserId } = await params;
  if (!validClerkId(clerkUserId)) {
    return NextResponse.json({ error: "Not a Clerk user id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const role = body?.role as Role;
  const fundId = Number(body?.fundId);

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a role." }, { status: 400 });
  }
  if (!Number.isInteger(fundId) || fundId < 1) {
    return NextResponse.json({ error: "Pick a fund." }, { status: 400 });
  }

  // Checked rather than left to the foreign key, so a bad fund comes back as a
  // sentence instead of a constraint name.
  const fund = await db.fund.findUnique({ where: { id: fundId }, select: { name: true } });
  if (!fund) return NextResponse.json({ error: "That fund does not exist." }, { status: 400 });

  const saved = await db.userRole.upsert({
    where: { clerkUserId },
    create: { clerkUserId, fundId, role, assignedBy: viewer.clerkUserId },
    update: { fundId, role, assignedBy: viewer.clerkUserId },
  });

  return NextResponse.json({
    clerkUserId,
    role: saved.role,
    fundId: saved.fundId,
    fundName: fund.name,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { viewer } = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.kind === "unconfigured") {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 503 });
  }
  if (!isManagement(viewer)) {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 403 });
  }

  const db = getDb();
  if (!db) return unconfigured();

  const { clerkUserId } = await params;
  if (!validClerkId(clerkUserId)) {
    return NextResponse.json({ error: "Not a Clerk user id." }, { status: 400 });
  }

  // deleteMany, not delete: removing an assignment that is already absent is
  // the same outcome the caller wanted, and a 404 there is noise.
  await db.userRole.deleteMany({ where: { clerkUserId } });

  return new NextResponse(null, { status: 204 });
}
