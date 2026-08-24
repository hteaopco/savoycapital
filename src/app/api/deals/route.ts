import { NextResponse } from "next/server";
import { DEFAULT_FUND_ID, getDb } from "@/lib/db";
import { parseDollarsToCents, parseDateInput } from "@/lib/money";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

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

export async function GET(request: Request) {
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

  // `?fundId=` filters the list (owner, 2026-08-24: "select the fund to view
  // investments in that fund only"). Absent or unreadable falls back to fund 1
  // rather than returning every fund's deals — a filter that silently widens
  // when its input is malformed is the wrong failure for a screen showing
  // deal-level figures.
  const requested = Number(new URL(request.url).searchParams.get("fundId"));
  const fundId = Number.isInteger(requested) && requested > 0 ? requested : DEFAULT_FUND_ID;

  const deals = await db.deal.findMany({
    where: { fundId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({
    deals: deals.map((d) => ({
      id: d.id,
      fundId: d.fundId,
      name: d.name,
      // BigInt is not JSON-serialisable; cents stay exact as a Number to about
      // $90 trillion, so the width lives in the column and not on the wire.
      amountCents: d.amountCents === null ? null : Number(d.amountCents),
      investmentDate: d.investmentDate ? d.investmentDate.toISOString().slice(0, 10) : null,
      createdAt: d.createdAt.toISOString(),
      documentCount: d._count.documents,
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  // The deal lands in the fund the screen is filtered to, so creating while
  // looking at a fund does not quietly file the deal somewhere else.
  const requestedFund = Number(body?.fundId);
  const fundId =
    Number.isInteger(requestedFund) && requestedFund > 0 ? requestedFund : DEFAULT_FUND_ID;

  // Length-capped as well as presence-checked: the column is unbounded TEXT, and
  // a name is a label rather than a place to paste a memo.
  if (!name) {
    return NextResponse.json({ error: "A deal name is required." }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Deal name is too long (200 characters max)." }, { status: 400 });
  }

  const fund = await db.fund.findUnique({ where: { id: fundId }, select: { id: true } });
  if (!fund) return NextResponse.json({ error: "That fund does not exist." }, { status: 400 });

  // Both optional at creation — the owner names a deal first and fills the
  // figures in after, which is exactly the backfill the screen is built for.
  const amountRaw = typeof body?.amountCents === "string" ? body.amountCents : "";
  const amountCents = amountRaw ? parseDollarsToCents(amountRaw) : null;
  if (amountRaw && amountCents === null) {
    return NextResponse.json({ error: "That investment size is not a number." }, { status: 400 });
  }

  const investmentDate = parseDateInput(
    typeof body?.investmentDate === "string" ? body.investmentDate : "",
  );
  if (investmentDate === null) {
    return NextResponse.json({ error: "Investment date must be YYYY-MM-DD." }, { status: 400 });
  }

  const deal = await db.deal.create({
    data: {
      name,
      fundId,
      createdBy: viewer.clerkUserId,
      amountCents: amountCents === null ? null : BigInt(amountCents),
      investmentDate: investmentDate ?? null,
    },
  });

  return NextResponse.json(
    {
      id: deal.id,
      fundId: deal.fundId,
      name: deal.name,
      amountCents: deal.amountCents === null ? null : Number(deal.amountCents),
      investmentDate: deal.investmentDate
        ? deal.investmentDate.toISOString().slice(0, 10)
        : null,
      createdAt: deal.createdAt.toISOString(),
      documentCount: 0,
    },
    { status: 201 },
  );
}
