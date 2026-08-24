import { NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  MAX_UPLOAD_BYTES,
  PREFIX,
  getR2,
  safeFilename,
} from "@/lib/r2";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";

/**
 * The fund's document store — list and upload.
 *
 * `GET`  → every object under `management/`, newest first.
 * `POST` → one file, `multipart/form-data`, field name `file`.
 *
 * ## Who can reach this
 *
 * **Management only, which today means anyone signed in.** `src/proxy.ts`
 * closes every route not on its short public list, so this path is protected by
 * being absent from it — do not add it there. The `auth()` check below is a
 * second, deliberate assertion rather than a redundant one: this route hands
 * back the fund's documents, and the cost of it ever being reachable without a
 * session is high enough to be worth stating in the handler that serves them
 * instead of relying on a file the CODER seat does not own.
 *
 * **This is NOT an investor surface and must not become one by accident.** Every
 * signed-in user currently sees everything, because sign-up is restricted and
 * the population is two people (DECISIONS 2026-08-24). Serving investors needs
 * an authorization layer that does not exist yet; until it does, `PREFIX.investors`
 * is reserved and unreadable through any route here.
 *
 * ## Why bytes go through the app rather than a presigned URL
 *
 * A presigned URL is valid for its whole TTL to whoever holds it — browser
 * history, a forwarded link, a referrer header. Streaming through a handler
 * that checks the session on every request keeps the fund's documents on our
 * own origin and leaves nothing that outlives the request. It also means the
 * bucket needs no CORS policy at all, because the browser never talks to R2
 * directly. The cost is our bandwidth, which at this volume is nothing.
 */

// Uploads and listings must never be cached or prerendered: both are per-request
// and one of them mutates.
export const dynamic = "force-dynamic";

/** Shape returned to the client. Deliberately not the raw S3 response. */
type FileEntry = {
  key: string;
  name: string;
  sizeBytes: number;
  uploadedAt: string | null;
};

function unconfigured() {
  // 503, not 500: the app is fine, this subsystem is not set up. The message
  // names the variables so a deploy that forgot one says so out loud.
  return NextResponse.json(
    {
      error:
        "File storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
    },
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

  const r2 = getR2();
  if (!r2) return unconfigured();

  const listed = await r2.client.send(
    new ListObjectsV2Command({
      Bucket: r2.bucket,
      Prefix: PREFIX.management,
    }),
  );

  const files: FileEntry[] = (listed.Contents ?? [])
    .filter((o) => o.Key && !o.Key.endsWith("/"))
    .map((o) => ({
      key: o.Key!,
      // The key is `management/<uuid>/<filename>`, so the display name is the
      // last segment. The uuid is what makes the key unique; the filename is
      // carried in the key rather than in object metadata so a listing needs
      // one round trip instead of one per object.
      name: o.Key!.split("/").pop() ?? o.Key!,
      sizeBytes: o.Size ?? 0,
      uploadedAt: o.LastModified?.toISOString() ?? null,
    }))
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));

  return NextResponse.json({ files });
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

  const r2 = getR2();
  if (!r2) return unconfigured();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a `file` field." },
      { status: 400 },
    );
  }

  // Checked before reading the body into memory. `File.size` is the declared
  // length; the buffer length is re-checked below because the declaration is
  // the client's claim, not a fact.
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.` },
      { status: 413 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.` },
      { status: 413 },
    );
  }

  const name = safeFilename(file.name);
  const key = `${PREFIX.management}${crypto.randomUUID()}/${name}`;

  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      // The browser's claim about the type. It is echoed back on download but
      // never trusted to decide anything — the download route forces an
      // attachment disposition precisely so a mislabelled file cannot render
      // in place on our origin.
      ContentType: file.type || "application/octet-stream",
      ContentLength: body.byteLength,
    }),
  );

  return NextResponse.json(
    { key, name, sizeBytes: body.byteLength },
    { status: 201 },
  );
}
