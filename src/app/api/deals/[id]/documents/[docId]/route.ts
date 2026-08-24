import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { getR2 } from "@/lib/r2";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * One document: move it between folders, or delete it.
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

/**
 * Delete one document — its row and its bytes.
 *
 * ## Order of writes, and why it is the reverse of the upload
 *
 * **Row first, object second.** The two stores cannot be made atomic, so the
 * only question is which half-failure survives — and the answer is the same one
 * the upload route reaches from the other direction: never leave a row without
 * its object.
 *
 * - Row gone, object left → an orphaned object. Invisible, costs a fraction of
 *   a cent, findable by diffing keys against rows.
 * - Object gone, row left → a document on screen whose View button 404s, with
 *   no way to tell what the file was meant to be.
 *
 * So the upload writes the object first and the delete removes the row first.
 * Both orders serve one rule; they only look opposite.
 *
 * ## R2 being unconfigured does not block the delete
 *
 * If the bucket is unreachable the row still goes, and the object is left
 * behind. Refusing would mean a document the owner has deleted staying on
 * screen because of a variable that has nothing to do with it — and the
 * leftover object is the failure this route is already willing to accept.
 *
 * Scoped to the deal in the path, same as PATCH: a document id alone must not
 * be enough to delete something out of a deal you did not name.
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

  // Read the key before the row goes — afterwards there is nothing left that
  // names the object.
  const doc = await db.dealDocument.findFirst({
    where: { id: documentId, dealId },
    select: { key: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.dealDocument.delete({ where: { id: documentId } });

  const r2 = getR2();
  if (r2) {
    try {
      await r2.client.send(
        new DeleteObjectCommand({ Bucket: r2.bucket, Key: doc.key }),
      );
    } catch {
      // Swallowed on purpose. The row is already gone, so the document is gone
      // as far as the product is concerned; failing the request here would tell
      // the owner the delete did not work when the visible half of it did.
      // What is left is an orphaned object, which is the survivable side.
    }
  }

  return new NextResponse(null, { status: 204 });
}
