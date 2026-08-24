import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 — the fund's document store (owner, 2026-08-24).
 *
 * R2 speaks the S3 API, so this is `@aws-sdk/client-s3` pointed at Cloudflare
 * rather than AWS. Region is the literal string "auto": R2 has no regions in
 * the S3 sense, but SigV4 refuses to sign without one, and "auto" is what
 * Cloudflare documents.
 *
 * ## The bucket is private and nothing here may change that
 *
 * The bucket has **no public development URL and no custom domain**, which is
 * what makes "private" true — not anything in this file. Every byte reaches a
 * person through a route handler that has already checked their Clerk session.
 * If either of those bucket settings is ever enabled, every object becomes
 * world-readable at a guessable URL and no code in this repo will notice. That
 * is the same shape as the sign-up-mode risk in CLAUDE.md, one layer down.
 *
 * ## Why the client is built lazily
 *
 * CI runs `next build` with **no secrets set** — deliberately, so a fork PR
 * cannot leak them and so a change that makes the build need one is visible.
 * A module-scope `new S3Client({...})` reading absent env vars is exactly such
 * a change. So the client is constructed on first use and the routes answer
 * 503 when it is unconfigured, which keeps the build honest and turns a missing
 * variable into a legible error rather than a crash on an unrelated page.
 */

/**
 * Prefix per audience. **The audience is the OUTERMOST segment on purpose** —
 * it is what `isServableKey()` guards on, so the read boundary is the first
 * thing in the key rather than something nested inside it.
 *
 * Full layout: `<audience>/funds/<fundId>/deals/<dealId>/<uuid>/<filename>`
 */
export const PREFIX = {
  /** Rodney and Jett. Everything the fund holds about itself. */
  management: "management/",
  /**
   * Reserved, and NOT served by any route today — but no longer for want of an
   * authorization layer. That landed on 2026-08-24 (`src/lib/authz.ts`), and it
   * already scopes an investor to their own fund. What is missing is narrower:
   * nothing UPLOADS to this prefix (the API refuses the audience) and no route
   * reads it, so there is nothing here to serve.
   *
   * When it lands, `funds/<fundId>/` inside this prefix is the boundary: an
   * investor belongs to a fund and may read that fund's investor-facing
   * documents (owner, 2026-08-24). That is why the fund id is in the key and
   * not only in Postgres — the check should not need a database round trip to
   * decide whether a key is readable.
   */
  investors: "investors/",
} as const;

/** Audience, as the schema's enum spells it, mapped to its key prefix. */
export const PREFIX_FOR_AUDIENCE = {
  MANAGEMENT: PREFIX.management,
  INVESTOR: PREFIX.investors,
} as const;

/**
 * Build the object key for one uploaded file.
 *
 * The uuid segment is what guarantees uniqueness; the filename rides along so
 * a listing and a `Content-Disposition` both have something human to show
 * without a second lookup.
 */
export function documentKey(args: {
  audience: keyof typeof PREFIX_FOR_AUDIENCE;
  fundId: number;
  dealId: number;
  filename: string;
}): string {
  const prefix = PREFIX_FOR_AUDIENCE[args.audience];
  return `${prefix}funds/${args.fundId}/deals/${args.dealId}/${crypto.randomUUID()}/${safeFilename(args.filename)}`;
}

/** Hard ceiling on an upload. Bodies are buffered, so this bounds memory too. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type R2Config = {
  client: S3Client;
  bucket: string;
};

let cached: R2Config | null = null;

/**
 * The configured client, or `null` when the environment is incomplete.
 *
 * Returns rather than throws: an unconfigured deploy should answer 503 on the
 * file routes and keep serving every other page, not 500 the whole app the way
 * a missing Clerk key does.
 */
export function getR2(): R2Config | null {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  cached = {
    bucket,
    client: new S3Client({
      region: "auto",
      // DERIVED, never a fifth environment variable. The endpoint is a pure
      // function of the account id, so storing both invites the day they
      // disagree and the app talks to the wrong account.
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };

  return cached;
}

/**
 * Strip a user-supplied filename down to something safe to put in a key and in
 * a `Content-Disposition` header.
 *
 * Path separators, quotes and control characters go, because a key is a path
 * and a header is a header. The uuid segment in front of this in the key is
 * what actually guarantees uniqueness — this only has to be inert.
 */
export function safeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    // Control characters, DEL and a double quote, by explicit escape rather
    // than as literal bytes: these would smuggle a newline into the
    // Content-Disposition header or close its filename="" early.
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "file";
}

/**
 * True when `key` sits under a prefix this app is allowed to serve.
 *
 * The key arrives from the URL on the download route, so it is untrusted input.
 * Without this an `investors/` object — or anything else that ever lands in the
 * bucket — would be readable through a route whose only check is "management is
 * signed in". `..` cannot escape an S3 key the way it escapes a filesystem
 * path, but it is rejected anyway rather than reasoned about.
 */
export function isServableKey(key: string): boolean {
  if (!key || key.includes("..")) return false;
  return key.startsWith(PREFIX.management);
}
