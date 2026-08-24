# PLAYBOOK — document storage (Cloudflare R2)

How the fund's document store works, how to bring it up, and what will bite someone.

Subsystem status: **code complete, management-only.** Uploads and downloads work for anyone
signed in. Investor access is **not built** and needs a decision that has not been made — see
§ 4.

---

## 1. How it works

R2 is S3-compatible, so this is `@aws-sdk/client-s3` pointed at Cloudflare rather than AWS.

| Layer | File | What it does |
|---|---|---|
| Client + guards | `src/lib/r2.ts` | Lazy `S3Client`, prefix constants, filename sanitiser, key guard |
| List + upload | `src/app/api/files/route.ts` | `GET` lists `management/`, `POST` takes one multipart file |
| Download + delete | `src/app/api/files/[...key]/route.ts` | `GET` streams as an attachment, `DELETE` removes |

**Object keys are `management/<uuid>/<filename>`.** The uuid guarantees uniqueness; the
filename rides in the key rather than in object metadata so a listing costs one round trip
instead of one per object.

**`investors/` is reserved and no route reads it.** `isServableKey()` refuses anything that
does not start with `management/`.

### Where the privacy boundary actually is

**In the Cloudflare dashboard, not in this repo.** The bucket has no **Public Development
URL** and no **Custom Domain**. Those two settings are what make the store private. Enable
either and every object becomes readable by anyone at a guessable URL — no auth, no
signature, no expiry — and **nothing in this code will notice.**

That is the same shape as the sign-up-mode risk in `CLAUDE.md`, one layer down. Treat both
toggles the way you would treat `src/proxy.ts`'s public list.

### Why bytes go through the app instead of a presigned URL

A presigned URL is valid for its whole TTL to whoever holds it — browser history, a forwarded
link, a referrer header. Streaming through a handler that re-checks the session every request
keeps the documents on our origin and leaves nothing behind that outlives the request.

It also means **the bucket needs no CORS policy at all**, because the browser never talks to
R2 directly. One less public surface. The cost is our bandwidth, which at this volume is
nothing.

---

## 2. Bring-up

1. **Create the bucket.** Done — `savoycapital`, North America (WNAM), Standard storage class.
2. **Leave Public Development URL DISABLED and add no Custom Domain.** § 1 says why.
3. **Create an API token.** R2 → Manage R2 API Tokens → Create API Token:
   - Permission **Object Read & Write** — *not* Admin Read & Write, which can create and
     delete buckets the app never touches.
   - **Apply to specific buckets only → `savoycapital`**, not all buckets.
   - Skip client IP filtering; Railway egress is not static on most plans.
4. **Set four variables** on the Railway service *and* in local `.env.local`. `.env.example`
   documents them.
5. **Verify** with § 3's checklist.

### The variables

```
R2_ACCOUNT_ID           # the 32-hex string in your S3 API endpoint URL
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET=savoycapital
```

**There is deliberately no `R2_ENDPOINT`.** `src/lib/r2.ts` derives it as
`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, so the two cannot disagree.

### Verifying bring-up worked

- Signed out, `GET /api/files` → 307 to `/sign-in`. It is protected by being **absent from
  `src/proxy.ts`'s public list**; do not add it there.
- Signed in, `GET /api/files` → `{"files":[]}` on an empty bucket. A 503 means a variable is
  missing and the body names which four to check.
- `POST` a small PDF, then `GET /api/files` → it appears. Fetch its `key` → the file
  downloads as an attachment.
- The object is **not** reachable at any `r2.dev` or custom-domain URL. If it is, step 2 was
  skipped.

---

## 3. GOTCHAS

**GOTCHA 1 — the two bucket toggles are the whole privacy boundary.**
*Symptom:* none. Everything keeps working; the documents are just also public.
*Cause:* Public Development URL or a Custom Domain serves objects with no auth at all.
*Fix:* keep both off. There is no code-side mitigation, which is exactly why this is first.

**GOTCHA 2 — never give these variables a `NEXT_PUBLIC_` prefix.**
That prefix inlines a value into the browser bundle. For `R2_SECRET_ACCESS_KEY` it would
publish the credential to every visitor. The trap is that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
sits directly above them in `.env.example` and carries the prefix legitimately, so the wrong
pattern is already in the file.

**GOTCHA 3 — the client is built lazily, and it must stay that way.**
CI runs `next build` with **no secrets set** on purpose. A module-scope `new S3Client({...})`
reading absent env vars would make the build need a secret, which is the thing that setup is
designed to catch. `getR2()` returns `null` when unconfigured and the routes answer 503.

**GOTCHA 4 — downloads are always `Content-Disposition: attachment`.**
*Cause:* an uploaded HTML or SVG served inline would execute on our own origin against a
signed-in session — the one way a document store becomes a cross-site scripting hole.
`X-Content-Type-Options: nosniff` backs it up. Do not "improve" this by rendering PDFs inline
without thinking about what else can be uploaded.

**GOTCHA 5 — an out-of-prefix key returns 404, not 403.**
Deliberate. A distinct status for "exists but not yours" confirms the object exists, which is
itself a disclosure once this bucket holds more than one audience.

**GOTCHA 6 — uploads are buffered, capped at 25MB.**
`MAX_UPLOAD_BYTES` in `src/lib/r2.ts`. The body is read into memory, so the cap bounds memory
as well as storage. Raising it meaningfully means switching to `@aws-sdk/lib-storage`'s
multipart `Upload` rather than just changing the number.

**GOTCHA 7 — no lifecycle rule deletes anything, and that is intentional.**
The bucket has only the default multipart-abort rule, which cleans up orphaned partial
uploads. Do not add an object-expiration rule: fund records are the last thing that should
age out on a timer.

---

## 4. Deliberately not built

- **Investor access.** The blocker is authorization, not storage. `src/proxy.ts` asks only
  whether somebody is signed in, which is sufficient *only* while the population is two people
  who both see everything (DECISIONS 2026-08-24). Give investors Clerk accounts under that
  model and every investor reaches `/portal/portfolio` — fund size, every position, every
  amount — plus every other investor's documents. Owner chose management-only for now
  (2026-08-24). `PREFIX.investors` is reserved so the eventual layer does not have to rewrite
  keys that already exist.
- **Any UI.** These are API routes. A screen to drive them is UI scope and needs the owner's
  go-ahead per `.claude/rules/ui-governance.md` § 1.
- **Bucket Lock (immutable retention).** Genuinely valuable for investor statements — it
  proves a document was not altered — but it also blocks deleting anything uploaded by
  mistake. Worth revisiting once the key layout has settled.
- **Event notifications.** Requires a Workers Paid plan, and nothing needs to react to an
  upload yet.
