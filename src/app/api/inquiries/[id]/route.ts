import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { getR2 } from "@/lib/r2";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * One enquiry: mark it read, or delete it. **Management only, both.**
 *
 * `PATCH` sets `readAt`, which is what clears the nav badge.
 *
 * `DELETE` removes the row and its files (owner, 2026-09-07: "have a way to
 * delete submissions"). Two things about the order matter:
 *
 *  - **R2 objects go first, the row last.** Delete the row first and a failure
 *    part-way leaves objects in the bucket with nothing pointing at them —
 *    unreachable, unbilled-for by anyone watching, and impossible to find
 *    again. This way a failure leaves the row, which is visible and retryable.
 *  - **A failed object delete does not block the row.** The alternative is an
 *    enquiry the owner cannot remove because of a storage hiccup, and the whole
 *    ask was to be able to remove them.
 *
 * There is no soft delete. The owner asked to delete submissions, and a spam
 * row that stays in the table under a flag is still a row he has to look past.
 */
async function requireManagement() {
  const { viewer } = await getViewer();
  if (viewer.kind === "anonymous") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (viewer.kind === "unconfigured") {
    return { error: NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 503 }) };
  }
  if (!isManagement(viewer)) {
    return { error: NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 403 }) };
  }
  return { error: null };
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManagement();
  if (guard.error) return guard.error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });

  try {
    await db.inquiry.update({ where: { id }, data: { readAt: new Date() } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManagement();
  if (guard.error) return guard.error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });

  const files = await db.inquiryFile.findMany({
    where: { inquiryId: id },
    select: { key: true },
  });

  const r2 = getR2();
  if (r2) {
    for (const file of files) {
      try {
        await r2.client.send(
          new DeleteObjectCommand({ Bucket: r2.bucket, Key: file.key }),
        );
      } catch {
        // Deliberate: see the header. A storage hiccup must not make an
        // enquiry undeletable.
      }
    }
  }

  try {
    // `InquiryFile` rows go with it — the relation is `onDelete: Cascade`.
    await db.inquiry.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
