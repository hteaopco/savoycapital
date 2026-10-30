import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { getR2 } from "@/lib/r2";
import { parseDollarsToCents, parseDateInput } from "@/lib/money";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * One deal and its documents: read it, edit it, or delete it.
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
    estValueCents:
      deal.estValueCents === null ? null : Number(deal.estValueCents),
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
 * Mutable: **the name**, investment size, **estimated value**, investment date,
 * instrument, terms, fees and the "why we like it" paragraph. The figures are
 * what the Portfolio chart and its investments table are built from; the prose
 * is read by investors on the drill-down.
 *
 * **`fundId` is NOT mutable**: moving a deal between funds would strand every
 * R2 key already written under `.../funds/<fundId>/deals/<dealId>/`, and the
 * key is what the read boundary guards on. A deal in the wrong fund is
 * re-created, not moved.
 *
 * **The name used to be lumped in with `fundId` as immutable, and that was
 * wrong** (fixed 2026-09-04, owner: "need a way to edit name of the deal"). The
 * argument above is entirely about object keys, and the name is not in one —
 * the key is `<audience>/funds/<fundId>/deals/<dealId>/<uuid>/<filename>`, in
 * which nothing is derived from `Deal.name`. Renaming strands nothing, breaks
 * no link, and moves no boundary; it only changes a label. The two were never
 * the same case, and one shared sentence made them look like it.
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
    name?: string;
    amountCents?: bigint | null;
    estValueCents?: bigint | null;
    investmentDate?: Date | null;
    instrument?: "PRIVATE_EQUITY" | "PRIVATE_CREDIT" | "OIL_AND_GAS" | "REAL_ESTATE" | null;
    terms?: string | null;
    fees?: string | null;
    whyWeLikeIt?: string | null;
  } = {};

  /*
    The name. Unlike every other field here it is NOT nullable — a deal with no
    name is a row nobody can identify in a list, so an empty string is a 400
    rather than a clear. That asymmetry is the reason this is not folded into
    the length-capped text loop below.
  */
  if ("name" in (body ?? {})) {
    const raw = typeof body?.name === "string" ? body.name.trim() : "";
    if (!raw) {
      return NextResponse.json({ error: "A deal needs a name." }, { status: 400 });
    }
    if (raw.length > 200) {
      return NextResponse.json(
        { error: `That name is too long (200 characters max, and this is ${raw.length}).` },
        { status: 400 },
      );
    }
    data.name = raw;
  }

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

  /*
    The estimated value. Same parse as the investment size — one converter,
    `parseDollarsToCents`, on both sides of the wire — and the same empty-string
    clears it. **Clearing means UNMARKED, not zero**: the table renders "—" and
    drops the position out of the gain/loss total rather than reading a blank
    as no change.
  */
  if ("estValueCents" in (body ?? {})) {
    const raw = typeof body?.estValueCents === "string" ? body.estValueCents.trim() : "";
    if (!raw) {
      data.estValueCents = null;
    } else {
      const cents = parseDollarsToCents(raw);
      if (cents === null) {
        return NextResponse.json(
          { error: "That estimated value is not a number." },
          { status: 400 },
        );
      }
      data.estValueCents = BigInt(cents);
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
      /*
        An explicit allowlist, not a cast. The enum grew on 2026-10-10 and will
        grow again; a cast would let any string through to Prisma and turn a
        typo into a database error instead of a 400 with a message.
      */
    } else if (
      raw === "PRIVATE_EQUITY" ||
      raw === "PRIVATE_CREDIT" ||
      raw === "OIL_AND_GAS" ||
      raw === "REAL_ESTATE"
    ) {
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
    name: saved.name,
    amountCents: saved.amountCents === null ? null : Number(saved.amountCents),
    estValueCents:
      saved.estValueCents === null ? null : Number(saved.estValueCents),
    investmentDate: saved.investmentDate
      ? saved.investmentDate.toISOString().slice(0, 10)
      : null,
    instrument: saved.instrument,
    terms: saved.terms,
    fees: saved.fees,
    whyWeLikeIt: saved.whyWeLikeIt,
  });
}

/**
 * Delete one deal — the row, every document row under it, and every object
 * those rows named (owner, 2026-10-30: "i need a way to delete a deal").
 *
 * ## The keys are read FIRST, and this is the whole correctness argument
 *
 * `DealDocument.deal` is `onDelete: Cascade`, so deleting the deal destroys
 * every document row with it — and those rows are **the only record of which
 * objects belong to this deal**. Delete the deal first and every one of its
 * objects is orphaned with nothing left on this side naming it: the document
 * route's recovery for a single orphan ("findable by diffing keys against
 * rows") stops working, because the rows you would diff against are gone too.
 *
 * So: read the keys, delete the deal, then delete the objects. The order is not
 * a preference, and a future refactor that moves the read after the delete
 * silently leaks the whole deal's storage.
 *
 * ## Rows first, objects second — same rule as the document delete
 *
 * The two stores cannot be made atomic, so the only question is which
 * half-failure survives, and the answer is the one that route already reached:
 * **never leave a row without its object.** An orphaned object is invisible and
 * costs a fraction of a cent; a row whose object is gone is a document on
 * screen whose View button 404s.
 *
 * ## Every object gets its own attempt
 *
 * One `DeleteObjectCommand` per key, each in its own try/catch, so one failing
 * key does not abandon the rest — the alternative leaves MORE orphans than
 * necessary for no benefit. Deliberately not `DeleteObjectsCommand`: the batch
 * API would be one round trip instead of N, but `DeleteObjectCommand` is the
 * call this bucket is already proven to answer, and a deal holds tens of
 * documents rather than thousands. This is not the place to find out whether
 * R2 implements the batch verb.
 *
 * ## R2 being unconfigured does not block the delete
 *
 * Same as the document route: the rows still go. Refusing would leave a deal
 * the owner has deleted on screen because of a variable that has nothing to do
 * with it, and the leftover objects are the failure this route already accepts.
 *
 * **Management only**, and `fundId` is not consulted: management sees every
 * fund in this product, which is the same scope the GET above already grants.
 */
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

  /*
    EVERY document, not just `audience: "MANAGEMENT"`.

    The GET above filters to management because it is building a screen and an
    investor-prefixed object has no route that can serve it. A delete is the
    opposite case: an object nothing can read is exactly the one that would
    never be noticed again. Filtering here would strand every `investors/`
    object this deal ever had.
  */
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { id: true, documents: { select: { key: true } } },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keys = deal.documents.map((d) => d.key);

  /*
    Cascades to every `DealDocument` row. `Deal.fund` is `onDelete: Restrict`,
    which constrains deleting a FUND and not a deal, so nothing blocks here.

    `deleteMany` rather than `delete`, for the reason the PATCH on one document
    gives for preferring `updateMany`: a miss is a 0-row result instead of a
    thrown P2025. Here the miss is a second DELETE for a deal already gone —
    a double-submit, or two tabs — and `delete` would answer that with an
    unhandled 500 describing a deal that is, by then, correctly deleted.
  */
  const { count } = await db.deal.deleteMany({ where: { id: dealId } });

  /*
    Somebody else deleted it between the read above and here, which means they
    are also deleting these objects. Returning 204 rather than 404: the caller
    asked for this deal to be gone and it is gone, which is the whole contract
    of a delete. Re-sending the object deletes would be harmless but is work
    the other request already owns.
  */
  if (count === 0) return new NextResponse(null, { status: 204 });

  const r2 = getR2();
  let orphaned = 0;
  if (r2) {
    for (const key of keys) {
      try {
        await r2.client.send(
          new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }),
        );
      } catch {
        // Counted, not thrown. The deal is gone as far as the product is
        // concerned, so failing the request would report a delete that did not
        // work when the visible half of it did.
        orphaned += 1;
      }
    }
  } else {
    orphaned = keys.length;
  }

  /*
    204 would match the document route, but this one has something to say that
    that one does not: how many objects were left behind. With no body there is
    nowhere to put it, and "the deal is deleted and 3 files could not be removed
    from storage" is worth one line in a server log.
  */
  if (orphaned > 0) {
    console.warn(
      `[deals] deleted deal ${dealId}; ${orphaned} of ${keys.length} object(s) left in R2`,
    );
  }

  return new NextResponse(null, { status: 204 });
}
