import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseDollarsToCents, parseDateInput } from "@/lib/money";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * One deal and its documents.
 *
 * Management only, by being absent from `src/proxy.ts`'s public list. Investor
 * documents are excluded from the response rather than merely unlinked: nothing
 * serves that prefix yet, so returning rows pointing at unreadable objects would
 * put a View button on the screen that cannot work.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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
  if (!db) {
    return NextResponse.json(
      { error: "The database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const dealId = Number(id);
  // `Number("")` is 0 and `Number("1.5")` is 1.5, so presence and integer-ness
  // are both checked rather than assumed from a successful parse.
  if (!Number.isInteger(dealId) || dealId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      documents: {
        where: { audience: "MANAGEMENT" },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: deal.id,
    fundId: deal.fundId,
    name: deal.name,
    // BigInt does not survive JSON; cents stay exact as a Number to about $90
    // trillion, so the width lives in the column and not on the wire.
    amountCents: deal.amountCents === null ? null : Number(deal.amountCents),
    investmentDate: deal.investmentDate
      ? deal.investmentDate.toISOString().slice(0, 10)
      : null,
    instrument: deal.instrument,
    terms: deal.terms,
    fees: deal.fees,
    whyWeLikeIt: deal.whyWeLikeIt,
    createdAt: deal.createdAt.toISOString(),
    documents: deal.documents.map((doc) => ({
      id: doc.id,
      key: doc.key,
      filename: doc.filename,
      description: doc.description,
      folder: doc.folder,
      sizeBytes: doc.sizeBytes,
      contentType: doc.contentType,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  });
}

/**
 * Set a deal's investment size and date (owner, 2026-08-24).
 *
 * This is the backfill path as much as the edit path: the deal that existed
 * before these columns has neither, and the screen opens its editor for exactly
 * that reason.
 *
 * Mutable: investment size, investment date, instrument, terms, fees and the
 * "why we like it" paragraph. The first five are what the Portfolio chart is
 * built from; the sixth is management-facing prose that no chart reads.
 * **Not the name, and not
 * `fundId`**: moving a deal between funds would strand every R2 key already
 * written under `.../funds/<fundId>/deals/<dealId>/`, and the key is what the
 * read boundary guards on. A deal in the wrong fund is re-created, not moved.
 *
 * An explicit `null` clears a value; an absent key leaves it alone. That
 * distinction is why this reads keys off the body rather than spreading it.
 */
export async function PATCH(request: Request, { params }: Params) {
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
  if (!db) {
    return NextResponse.json(
      { error: "The database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isInteger(dealId) || dealId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.deal.findUnique({ where: { id: dealId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const data: {
    amountCents?: bigint | null;
    investmentDate?: Date | null;
    instrument?: "PRIVATE_EQUITY" | "PRIVATE_CREDIT" | null;
    terms?: string | null;
    fees?: string | null;
    whyWeLikeIt?: string | null;
  } = {};

  if ("amountCents" in (body ?? {})) {
    const raw = typeof body?.amountCents === "string" ? body.amountCents.trim() : "";
    if (!raw) {
      data.amountCents = null;
    } else {
      const cents = parseDollarsToCents(raw);
      if (cents === null) {
        return NextResponse.json({ error: "That investment size is not a number." }, { status: 400 });
      }
      data.amountCents = BigInt(cents);
    }
  }

  if ("investmentDate" in (body ?? {})) {
    const parsed = parseDateInput(
      typeof body?.investmentDate === "string" ? body.investmentDate : "",
    );
    if (parsed === null) {
      return NextResponse.json({ error: "Investment date must be YYYY-MM-DD." }, { status: 400 });
    }
    data.investmentDate = parsed ?? null;
  }

  if ("instrument" in (body ?? {})) {
    const raw = typeof body?.instrument === "string" ? body.instrument : "";
    if (!raw) {
      data.instrument = null;
    } else if (raw === "PRIVATE_EQUITY" || raw === "PRIVATE_CREDIT") {
      data.instrument = raw;
    } else {
      return NextResponse.json({ error: "Unknown instrument." }, { status: 400 });
    }
  }

  /*
    Free text, length-capped at the route because that is where a rejection can
    carry a message. These are unbounded TEXT columns feeding fixed-width
    panels, not a place to paste a credit agreement.

    Two caps, not one: `terms` and `fees` render as a single line each, while
    `whyWeLikeIt` is a paragraph and needs the room to be one. Both are product
    rules about what fits the panel rather than storage rules, which is why
    neither is a `VARCHAR(n)` in the schema.
  */
  const TEXT_CAPS = { terms: 500, fees: 500, whyWeLikeIt: 2000 } as const;
  const FIELD_LABEL = {
    terms: "terms",
    fees: "fees",
    whyWeLikeIt: "why-we-like-it",
  } as const;

  for (const key of ["terms", "fees", "whyWeLikeIt"] as const) {
    if (key in (body ?? {})) {
      const raw = typeof body?.[key] === "string" ? (body[key] as string).trim() : "";
      if (raw.length > TEXT_CAPS[key]) {
        return NextResponse.json(
          {
            error: `That ${FIELD_LABEL[key]} entry is too long (${TEXT_CAPS[key]} characters max, and this is ${raw.length}).`,
          },
          { status: 400 },
        );
      }
      data[key] = raw || null;
    }
  }

  const saved = await db.deal.update({ where: { id: dealId }, data });

  return NextResponse.json({
    id: saved.id,
    amountCents: saved.amountCents === null ? null : Number(saved.amountCents),
    investmentDate: saved.investmentDate
      ? saved.investmentDate.toISOString().slice(0, 10)
      : null,
    instrument: saved.instrument,
    terms: saved.terms,
    fees: saved.fees,
    whyWeLikeIt: saved.whyWeLikeIt,
  });
}
