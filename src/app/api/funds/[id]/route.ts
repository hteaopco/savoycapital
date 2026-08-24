import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseDollarsToCents, parseDateInput } from "@/lib/money";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * Set a fund's size and inception date (owner, 2026-08-24).
 *
 * This is the backfill path as much as the edit path: fund 1 predates both
 * columns, so both are null on the fund every deal belongs to, and the screen
 * opens its editor for exactly that reason.
 *
 * **Only those two fields are mutable.** Not the name — renaming is a separate
 * decision with its own blast radius, since the fund name is what an investor
 * would see beside their own documents.
 *
 * An explicit empty string clears a value; an absent key leaves it alone. That
 * distinction is why this reads keys off the body rather than spreading it: a
 * screen that saves one field must not blank the other.
 *
 * **Management only**, and it does not widen anything: `getViewer()` decides,
 * `src/proxy.ts` is untouched, and this route is protected by being absent from
 * its public list.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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
  const fundId = Number(id);
  if (!Number.isInteger(fundId) || fundId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.fund.findUnique({ where: { id: fundId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const data: { sizeCents?: bigint | null; inceptionDate?: Date | null } = {};

  if ("sizeCents" in (body ?? {})) {
    const raw = typeof body?.sizeCents === "string" ? body.sizeCents.trim() : "";
    if (!raw) {
      data.sizeCents = null;
    } else {
      const cents = parseDollarsToCents(raw);
      if (cents === null) {
        return NextResponse.json({ error: "That fund size is not a number." }, { status: 400 });
      }
      data.sizeCents = BigInt(cents);
    }
  }

  if ("inceptionDate" in (body ?? {})) {
    const parsed = parseDateInput(
      typeof body?.inceptionDate === "string" ? body.inceptionDate : "",
    );
    if (parsed === null) {
      return NextResponse.json({ error: "Inception date must be YYYY-MM-DD." }, { status: 400 });
    }
    data.inceptionDate = parsed ?? null;
  }

  const saved = await db.fund.update({ where: { id: fundId }, data });

  return NextResponse.json({
    id: saved.id,
    // BigInt is not JSON-serialisable; cents stay exact as a Number to about
    // $90 trillion, so the width lives in the column and not on the wire.
    sizeCents: saved.sizeCents === null ? null : Number(saved.sizeCents),
    inceptionDate: saved.inceptionDate ? saved.inceptionDate.toISOString().slice(0, 10) : null,
  });
}
