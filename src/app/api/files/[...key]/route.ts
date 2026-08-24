import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2, isServableKey } from "@/lib/r2";

/**
 * The fund's document store — download and delete one object.
 *
 * `GET`    → streams the object back as an attachment.
 * `DELETE` → removes it.
 *
 * The catch-all segment IS the object key, because a key contains slashes
 * (`management/<uuid>/<filename>`). That makes it untrusted URL input, so it
 * goes through `isServableKey()` before it reaches R2 — see that function for
 * why a prefix check rather than a sanitiser.
 *
 * Protected the same way as the list route: absent from `src/proxy.ts`'s public
 * allowlist, with an explicit `auth()` assertion in the handler because this one
 * returns the bytes.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string[] }> };

async function resolveKey({ params }: Params): Promise<string | null> {
  const { key } = await params;
  const joined = (key ?? []).map(decodeURIComponent).join("/");
  return isServableKey(joined) ? joined : null;
}

export async function GET(_request: Request, ctx: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r2 = getR2();
  if (!r2) return NextResponse.json({ error: "File storage is not configured." }, { status: 503 });

  const key = await resolveKey(ctx);
  // 404 rather than 403 on a key outside the served prefix. A different status
  // for "exists but not yours" would confirm the object exists, which is a
  // disclosure in itself once there is more than one audience in this bucket.
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let object;
  try {
    object = await r2.client.send(
      new GetObjectCommand({ Bucket: r2.bucket, Key: key }),
    );
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!object.Body) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = key.split("/").pop() ?? "file";

  return new NextResponse(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": object.ContentType ?? "application/octet-stream",
      ...(object.ContentLength
        ? { "Content-Length": String(object.ContentLength) }
        : {}),
      // ALWAYS an attachment, never inline. An uploaded HTML or SVG file
      // rendered inline would execute on our own origin, against a signed-in
      // session — the one way a document store turns into a cross-site
      // scripting hole. `safeFilename` has already stripped anything that
      // could close the quoted value early.
      "Content-Disposition": `attachment; filename="${filename}"`,
      // A private document has no business in any cache, shared or otherwise.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, ctx: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r2 = getR2();
  if (!r2) return NextResponse.json({ error: "File storage is not configured." }, { status: 503 });

  const key = await resolveKey(ctx);
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));

  return new NextResponse(null, { status: 204 });
}
