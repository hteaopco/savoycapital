import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * Funds — list and create.
 *
 * `GET`  → every fund, oldest first, with how many users sit on each.
 * `POST` → one fund: `{ name, inceptionDate? }`.
 *
 * **Authenticated, and that is the whole check.** `src/proxy.ts` closes every
 * route not on its short public list, so this path is protected by being absent
 * from it — do not add it there. The `auth()` call below is a second deliberate
 * assertion rather than a redundant one.
 *
 * There is no DELETE. `Deal.fundId` and `User.fundId` are both `onDelete:
 * Restrict`, so removing a fund with anything attached would fail at the
 * database anyway, and an empty fund is not worth a route that looks like it can
 * destroy one that is not.
 */

export const dynamic = "force-dynamic";

function unconfigured() {
  return NextResponse.json(
    { error: "The database is not configured. Set DATABASE_URL." },
    { status: 503 },
  );
}

export async function GET() {
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

  const funds = await db.fund.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { roles: true, deals: true } } },
  });

  return NextResponse.json({
    funds: funds.map((f) => ({
      id: f.id,
      name: f.name,
      // Date only. `@db.Date` comes back as a Date at UTC midnight; slicing the
      // ISO string keeps it the calendar day it was entered as, which
      // `toLocaleDateString` would shift westward.
      inceptionDate: f.inceptionDate ? f.inceptionDate.toISOString().slice(0, 10) : null,
      assignedCount: f._count.roles,
      dealCount: f._count.deals,
    })),
  });
}

export async function POST(request: Request) {
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

  const body: unknown = await request.json().catch(() => null);
  const name = typeof (body as { name?: unknown })?.name === "string"
    ? (body as { name: string }).name.trim()
    : "";
  const rawDate = (body as { inceptionDate?: unknown })?.inceptionDate;

  if (!name) {
    return NextResponse.json({ error: "A fund needs a name." }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: "That name is too long." }, { status: 400 });
  }

  // Optional. An empty string from an untouched date input is "not supplied",
  // not an error — the column is nullable precisely so a fund can exist before
  // anyone has looked the date up.
  let inceptionDate: Date | null = null;
  if (typeof rawDate === "string" && rawDate.trim()) {
    // `YYYY-MM-DD` is what <input type="date"> submits. Parsed as UTC midnight
    // so the stored calendar day is the one that was typed, whatever the
    // server's timezone is.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return NextResponse.json({ error: "Inception date must be YYYY-MM-DD." }, { status: 400 });
    }
    const parsed = new Date(`${rawDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "That is not a real date." }, { status: 400 });
    }
    inceptionDate = parsed;
  }

  const fund = await db.fund.create({
    data: { name, inceptionDate },
  });

  return NextResponse.json(
    {
      id: fund.id,
      name: fund.name,
      inceptionDate: fund.inceptionDate ? fund.inceptionDate.toISOString().slice(0, 10) : null,
      assignedCount: 0,
      dealCount: 0,
    },
    { status: 201 },
  );
}
