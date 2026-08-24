import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { MAX_UPLOAD_BYTES, documentKey, getR2, safeFilename } from "@/lib/r2";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * Upload one document into a deal. `multipart/form-data`: `file`, `description`,
 * and an optional `folder`.
 *
 * **Still one file per request, even though the screen uploads several.** The
 * client posts them one at a time and reports progress per file. A single
 * request carrying eight files would buffer all of them at once against one
 * 25MB-per-file ceiling, and one bad file would fail the batch with nothing
 * uploaded — this way six succeed, two report why, and the retry is only the
 * two.
 *
 * ## Order of writes, which is not arbitrary
 *
 * R2 first, Postgres second. The two stores cannot be made atomic, so the
 * question is only which half-failure is survivable:
 *
 * - Object written, row missing → an orphaned object. Invisible, costs a
 *   fraction of a cent, and a sweep can find it by diffing keys against rows.
 * - Row written, object missing → a document on screen with a View button that
 *   404s. The owner sees a broken product and has no way to tell which file it
 *   was meant to be.
 *
 * The first is strictly better, so the byte write goes first.
 *
 * ## Investor-facing uploads are refused, on purpose
 *
 * The audience is not a parameter. Nothing serves the `investors/` prefix —
 * `isServableKey()` rejects it — so accepting an investor upload would write a
 * file nobody can ever read while making the screen look like investors have
 * access. Investor access needs the authorization layer discussed in
 * DECISIONS 2026-08-24; when it lands, this is where the audience becomes an
 * input.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
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
  const r2 = getR2();
  if (!db || !r2) {
    return NextResponse.json(
      {
        error: !db
          ? "The database is not configured. Set DATABASE_URL."
          : "File storage is not configured. Set the four R2_* variables.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const dealId = Number(id);
  if (!Number.isInteger(dealId) || dealId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read the deal before touching R2: the fund id is part of the object key, and
  // a key built from an unverified deal id would file the document under a deal
  // that does not exist.
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const description = String(form.get("description") ?? "").trim();
  // Empty string and absent both mean "top level". Normalised to null here so
  // the column has one representation of that rather than two.
  const folder = String(form.get("folder") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a `file` field." },
      { status: 400 },
    );
  }
  if (!description) {
    return NextResponse.json({ error: "A description is required." }, { status: 400 });
  }
  if (description.length > 500) {
    return NextResponse.json(
      { error: "Description is too long (500 characters max)." },
      { status: 400 },
    );
  }
  if (folder && folder.length > 120) {
    return NextResponse.json(
      { error: "Folder name is too long (120 characters max)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.` },
      { status: 413 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  // Re-checked after buffering: `File.size` is the client's declaration, not a
  // fact about the bytes that arrived.
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.` },
      { status: 413 },
    );
  }

  const filename = safeFilename(file.name);
  const contentType = file.type || "application/octet-stream";
  const key = documentKey({
    audience: "MANAGEMENT",
    fundId: deal.fundId,
    dealId: deal.id,
    filename,
  });

  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  );

  const doc = await db.dealDocument.create({
    data: {
      dealId: deal.id,
      audience: "MANAGEMENT",
      key,
      filename,
      description,
      folder,
      sizeBytes: body.byteLength,
      contentType,
      uploadedBy: viewer.clerkUserId,
    },
  });

  return NextResponse.json(
    {
      id: doc.id,
      key: doc.key,
      filename: doc.filename,
      description: doc.description,
      folder: doc.folder,
      sizeBytes: doc.sizeBytes,
      contentType: doc.contentType,
      uploadedAt: doc.uploadedAt.toISOString(),
    },
    { status: 201 },
  );
}
