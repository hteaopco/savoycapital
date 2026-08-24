import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

/**
 * Move one document into a folder, or back out of one.
 *
 * `PATCH` with `{ "folder": "Personal Guarantees" }`, or `{ "folder": null }`
 * to return it to the deal's top level.
 *
 * ## Why this exists at all
 *
 * Folders arrived after documents did. Without a way to move what is already
 * uploaded, the feature would only help files that do not exist yet — and the
 * owner had ten sitting there on the day it was asked for, five of which are
 * plainly one folder and two another. A feature you cannot apply to your
 * existing data is a feature you have to re-upload to use.
 *
 * ## Only the folder is mutable
 *
 * Not the description, the filename, the key or the audience. The first two are
 * cheap to add when someone asks; the last two are not editable in principle —
 * the key names a specific object in R2, and the audience is the read boundary.
 * A PATCH that let either drift from the object it describes would be a way to
 * make the database lie about the bucket.
 *
 * **Authenticated**, and scoped: the document must belong to the deal named in
 * the path. Without that check, `/api/deals/1/documents/999` would edit
 * document 999 regardless of which deal it sits in — harmless while one person
 * sees every deal, and exactly the kind of thing that stops being harmless the
 * day investors exist.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "The database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const { id, docId } = await params;
  const dealId = Number(id);
  const documentId = Number(docId);
  if (
    !Number.isInteger(dealId) ||
    dealId < 1 ||
    !Number.isInteger(documentId) ||
    documentId < 1
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const raw = (payload as { folder?: unknown } | null)?.folder;
  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json(
      { error: "`folder` must be a string, or null to move to the top level." },
      { status: 400 },
    );
  }

  // Empty string means the same as null — one representation of "top level".
  const folder = raw === null ? null : raw.trim() || null;
  if (folder && folder.length > 120) {
    return NextResponse.json(
      { error: "Folder name is too long (120 characters max)." },
      { status: 400 },
    );
  }

  // Scoped to the deal in the path — see the header. `updateMany` rather than
  // `update` so a mismatch is a 0-row result rather than a thrown P2025.
  const { count } = await db.dealDocument.updateMany({
    where: { id: documentId, dealId },
    data: { folder },
  });

  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: documentId, folder });
}
