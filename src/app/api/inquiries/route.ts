import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/lib/db";
import { getR2, inquiryKey } from "@/lib/r2";
import {
  ALLOWED_UPLOAD_TYPES,
  LIMITS,
  clientIp,
  looksAutomated,
  rateLimit,
  validateInquiry,
} from "@/lib/inquiries";
import { notifyNewInquiry } from "@/lib/sms";

/**
 * `POST /api/inquiries` — the public contact form's endpoint.
 *
 * ## THIS IS THE ONLY UNAUTHENTICATED WRITE IN THE PRODUCT
 *
 * It is listed in `src/proxy.ts`'s public allowlist, which is the file
 * `CLAUDE.md` calls "the one control behind 'the fund's numbers are not on the
 * internet'". Adding a route there deserves the sentence that follows.
 *
 * **It only writes, and it reads nothing back.** The response carries no data
 * from the database — not the new row's id, not a count, nothing. A caller
 * learns exactly one bit: accepted, or not. There is no GET here, no listing,
 * and the files it stores land under `management/` where the only route that
 * serves them requires a management viewer. So the surface this opens is
 * "strangers can add rows and objects", and every control below is about
 * bounding that rather than about disclosure.
 *
 * ## What bounds it
 *
 * - **Honeypot** — a filled hidden field returns 200 and drops the submission.
 *   Silently, because telling a bot it was caught tells it what to change.
 * - **Rate limit** — best-effort, per IP, in memory. Read `rateLimit`'s comment
 *   for what that does not cover; it is a speed bump, not a control.
 * - **Field caps** before anything is written.
 * - **File caps** — count, per-file bytes, total bytes, and an ALLOWLIST of
 *   content types. A blocklist fails open on the type nobody thought of, and
 *   here that type is an executable.
 * - **Files are written AFTER the row**, so a storage failure cannot lose the
 *   message. A message with a missing attachment is recoverable by replying;
 *   an attachment with no message is not.
 *
 * ## Notification, and what still is not here
 *
 * A ClickSend SMS goes to management's Clerk phone numbers after the row lands
 * — **best-effort by contract**: `notifyNewInquiry()` cannot throw and cannot
 * fail this request, so an SMS outage never costs an enquiry. It also stays
 * silent without `CLICKSEND_*` set, which means **the red badge in the portal
 * nav remains the signal that does not depend on a secret being set.** That is
 * the whole reason the badge
 * shipped in the same change as the form — the owner's own build spec argued
 * that an unwatched form is worse than no form, and the badge is what answers
 * it. Do not remove it because a text message exists.
 *
 * Resend email is still named as coming up (owner, 2026-09-07) and is not here.
 */

export const runtime = "nodejs";

/** Body ceiling, checked before the multipart parse allocates anything. */
const MAX_BODY_BYTES = LIMITS.totalBytes + 64 * 1024; // files + generous field slack

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That submission is too large." }, { status: 413 });
  }

  if (!rateLimit(clientIp(request.headers)).allowed) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Please try again later." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read that submission." }, { status: 400 });
  }

  // Accepted and discarded. The caller is told nothing.
  if (looksAutomated(form)) return NextResponse.json({ ok: true });

  const parsed = validateInquiry(form);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > LIMITS.files) {
    return NextResponse.json(
      { error: `Please attach no more than ${LIMITS.files} files.` },
      { status: 400 },
    );
  }
  let total = 0;
  for (const file of files) {
    if (file.size > LIMITS.fileBytes) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than ${LIMITS.fileBytes / (1024 * 1024)}MB.` },
        { status: 400 },
      );
    }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `"${file.name}" is not a file type we accept.` },
        { status: 400 },
      );
    }
    total += file.size;
  }
  if (total > LIMITS.totalBytes) {
    return NextResponse.json({ error: "Those files are too large in total." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    // The form is the only way to reach the firm now that the mailto is gone,
    // so this is worth saying plainly rather than returning a generic failure.
    return NextResponse.json(
      { error: "We cannot take submissions right now. Please try again shortly." },
      { status: 503 },
    );
  }

  let inquiryId: number;
  try {
    const created = await db.inquiry.create({
      data: {
        ...parsed.value,
        submittedIp: clientIp(request.headers),
      },
      select: { id: true },
    });
    inquiryId = created.id;
  } catch {
    return NextResponse.json(
      { error: "We could not record that submission. Please try again." },
      { status: 500 },
    );
  }

  // Files second, and failures here do NOT fail the request: the message is
  // already safe, and losing it to a storage error would be the worse outcome.
  const r2 = getR2();
  if (r2 && files.length) {
    for (const file of files) {
      try {
        const key = inquiryKey({ inquiryId, filename: file.name });
        const body = Buffer.from(await file.arrayBuffer());
        await r2.client.send(
          new PutObjectCommand({
            Bucket: r2.bucket,
            Key: key,
            Body: body,
            ContentType: file.type,
          }),
        );
        await db.inquiryFile.create({
          data: {
            inquiryId,
            key,
            filename: file.name,
            sizeBytes: file.size,
            contentType: file.type,
          },
        });
      } catch {
        // Swallowed on purpose — see above. The admin screen shows what
        // attached; a file that did not is simply absent.
      }
    }
  }

  // Last, and awaited rather than floated: work left running after a response
  // is returned is not guaranteed to finish. `notifyNewInquiry` never throws
  // and carries its own 4s timeout, so the cost of awaiting it is bounded and
  // the cost of it failing is nothing.
  await notifyNewInquiry();

  return NextResponse.json({ ok: true });
}
