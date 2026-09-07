import "server-only";
import { getDb } from "./db";
import { HONEYPOT_FIELD } from "./inquiry-fields";

/**
 * The public contact form's server side: limits, validation and the abuse
 * controls that come with accepting input from strangers.
 *
 * ## Why this file has a security posture at all
 *
 * Every other write in this product comes from one of two signed-in people.
 * `POST /api/inquiries` is the first route anyone on the internet may call, and
 * `CLAUDE.md`'s risk framing — "a number reaching someone who should not see
 * it" — is about data flowing OUT. This is the opposite direction and needs its
 * own answer: spam, storage exhaustion, and oversized bodies.
 *
 * Nothing here is a substitute for a human reading what arrives. It is the
 * cheap set that stops a script.
 */

/** Field ceilings. Long enough for a real message, short enough to bound a row. */
export const LIMITS = {
  name: 100,
  email: 254, // the practical maximum length of an address, RFC 5321
  phone: 40,
  company: 200,
  message: 5_000,
  /** Per submission. Five is generous for a teaser and a financial summary. */
  files: 5,
  /** Per file. Below `MAX_UPLOAD_BYTES` so one file cannot spend the whole budget. */
  fileBytes: 10 * 1024 * 1024,
  /** Across all files in one submission. */
  totalBytes: 25 * 1024 * 1024,
} as const;

/**
 * What a stranger may upload.
 *
 * An allowlist, not a blocklist — the same reasoning as `src/proxy.ts`'s public
 * route list. A blocklist fails open on the type nobody thought of, and here
 * that type is an executable. Deal material is documents and spreadsheets.
 */
export const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
]);

export type InquiryInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
};

export type ValidationError = { field: string; message: string };

const clean = (v: FormDataEntryValue | null): string =>
  typeof v === "string" ? v.trim() : "";

/**
 * Validate and normalise a submission.
 *
 * Deliberately NOT a strict email regex. Address syntax is famously
 * unmatchable, and a regex that rejects a real address costs a real
 * opportunity while a regex that accepts a fake one costs nothing — nobody is
 * authenticated by this field. So: it must contain an `@` with something either
 * side, and that is all.
 */
export function validateInquiry(
  form: FormData,
): { ok: true; value: InquiryInput } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const firstName = clean(form.get("firstName"));
  const lastName = clean(form.get("lastName"));
  const email = clean(form.get("email"));
  const phone = clean(form.get("phone"));
  const company = clean(form.get("company"));
  const message = clean(form.get("message"));

  if (!firstName) errors.push({ field: "firstName", message: "First name is required." });
  if (!lastName) errors.push({ field: "lastName", message: "Last name is required." });
  if (!email) errors.push({ field: "email", message: "Email is required." });
  else if (!/^[^@\s]+@[^@\s]+$/.test(email))
    errors.push({ field: "email", message: "That does not look like an email address." });
  if (!message) errors.push({ field: "message", message: "Please tell us about the opportunity." });

  const tooLong = (v: string, max: number, field: string, label: string) => {
    if (v.length > max) errors.push({ field, message: `${label} is too long (max ${max}).` });
  };
  tooLong(firstName, LIMITS.name, "firstName", "First name");
  tooLong(lastName, LIMITS.name, "lastName", "Last name");
  tooLong(email, LIMITS.email, "email", "Email");
  tooLong(phone, LIMITS.phone, "phone", "Phone");
  tooLong(company, LIMITS.company, "company", "Company");
  tooLong(message, LIMITS.message, "message", "Message");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      company: company || null,
      message,
    },
  };
}

/**
 * The honeypot.
 *
 * A field hidden from people and left empty by them; a bot filling every input
 * it finds will put something in it. Costs nothing, stops the low tier, and
 * silently — a filled honeypot gets a 200 and is dropped, because telling a bot
 * it was caught is telling it what to change.
 *
 * The NAME lives in `inquiry-fields.ts` because the form needs it too and this
 * module is `server-only`. Re-exported here so callers on the server have one
 * import; there is still only one definition.
 */
export { HONEYPOT_FIELD } from "./inquiry-fields";

export function looksAutomated(form: FormData): boolean {
  return clean(form.get(HONEYPOT_FIELD)).length > 0;
}

/**
 * Best-effort per-IP rate limit, in memory.
 *
 * **Stated honestly, because the limits of this matter more than the fact of
 * it:** the map lives in one process. Railway runs a single instance today, so
 * it holds; the day this scales horizontally, each instance gets its own
 * allowance and the effective limit multiplies. It also resets on deploy. It is
 * a speed bump against a script, not a control anyone should rely on — the
 * durable version is a database check or a WAF rule, and neither is here.
 *
 * `.claudet/README.md` rule 3: do not describe an enforcement as stronger than
 * it executes.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function rateLimit(ip: string | null): { allowed: boolean } {
  // No usable address means no bucket to count against. Letting it through is
  // the deliberate choice: the alternative rejects real submissions from
  // anyone whose proxy chain we cannot read.
  if (!ip) return { allowed: true };

  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return { allowed: false };
  }

  recent.push(now);
  hits.set(ip, recent);

  // Bound the map so a spray of addresses cannot grow it without limit.
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return { allowed: true };
}

/**
 * The submitter's address, as far as it can be trusted.
 *
 * **`X-Forwarded-For` is appended to by every proxy in the chain, so the
 * LEFT-most entry is whatever the client claimed** — attacker-controlled, and
 * reading it is how a rate limiter hands its key to the attacker. The right-most
 * entry is the one the closest trusted proxy wrote, so that is what this takes.
 *
 * Behind Railway and Cloudflare that is the nearest hop rather than the true
 * origin, which makes the limit coarser than ideal — several submitters can
 * share a bucket. Coarse and honest beats precise and forgeable.
 */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return null;
  const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

/** How many enquiries have never been opened. Drives the nav badge. */
export async function unreadInquiryCount(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  try {
    return await db.inquiry.count({ where: { readAt: null } });
  } catch {
    // A badge is not worth failing a page render over.
    return 0;
  }
}
