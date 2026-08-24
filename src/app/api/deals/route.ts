import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DEFAULT_FUND_ID, getDb } from "@/lib/db";

/**
 * Deals — list and create.
 *
 * `GET`  → every deal in the fund, newest first, with a document count.
 * `POST` → one deal, `{ name }`.
 *
 * **Management only, which today means anyone signed in.** `src/proxy.ts` closes
 * every route not on its short public list, so this path is protected by being
 * absent from it — do not add it there. The `auth()` call below is a second
 * deliberate assertion, not a redundant one: deals name counterparties the fund
 * has not announced.
 *
 * Every deal is created in `DEFAULT_FUND_ID` (owner: "every deal id right now =
 * fundid 1"). The fund is a column rather than an assumption so that investor
 * access — scoped by fund — does not need a data migration when it lands.
 */

export const dynamic = "force-dynamic";

function unconfigured() {
  return NextResponse.json(
    { error: "The database is not configured. Set DATABASE_URL." },
    { status: 503 },
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return unconfigured();

  const deals = await db.deal.findMany({
    where: { fundId: DEFAULT_FUND_ID },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({
    deals: deals.map((d) => ({
      id: d.id,
      fundId: d.fundId,
      name: d.name,
      createdAt: d.createdAt.toISOString(),
      documentCount: d._count.documents,
    })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return unconfigured();

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  // Length-capped as well as presence-checked: the column is unbounded TEXT, and
  // a name is a label rather than a place to paste a memo.
  if (!name) {
    return NextResponse.json({ error: "A deal name is required." }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Deal name is too long (200 characters max)." }, { status: 400 });
  }

  const deal = await db.deal.create({
    data: { name, fundId: DEFAULT_FUND_ID, createdBy: userId },
  });

  return NextResponse.json(
    {
      id: deal.id,
      fundId: deal.fundId,
      name: deal.name,
      createdAt: deal.createdAt.toISOString(),
      documentCount: 0,
    },
    { status: 201 },
  );
}
