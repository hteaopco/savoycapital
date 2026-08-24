# PLAYBOOK — the Deal Room

How deals and their documents are stored, and what will bite someone.

Subsystem status: **built, management-only.** Investor-facing upload is refused at the API.

---

## 1. Two stores, and which holds what

| Lives in | What | Why there |
|---|---|---|
| **Postgres** (Prisma) | Deal name, document description, filename, size, uploader, timestamps | Neither a name nor a description is a byte, and R2's list call returns keys and sizes but **not** custom metadata — a listing built on object metadata costs one request per file |
| **R2** | The bytes | It is an object store |

`Fund → Deal → DealDocument`. Every deal is `fundId` 1 today (owner: *"every deal id right
now = fundid 1"*), and deal ids are sequential integers because the owner asked for "a deal
id that we can pull from later and work off of".

### Object keys

```
<audience>/funds/<fundId>/deals/<dealId>/<uuid>/<filename>
```

**The audience is the outermost segment on purpose.** `isServableKey()` in `src/lib/r2.ts`
guards on it, so the read boundary is the first thing in the key rather than something
nested inside. The uuid guarantees uniqueness; the filename rides along so a listing and a
`Content-Disposition` both have something human without a second lookup.

The fund id is in the **key** as well as in Postgres so the eventual investor check —
"may this person read this object?" — does not need a database round trip to answer.

### Write order: R2 first, Postgres second

The two stores cannot be made atomic, so the only question is which half-failure survives:

- **Object written, row missing** → an orphaned object. Invisible, costs a fraction of a
  cent, findable by diffing keys against rows.
- **Row written, object missing** → a document on screen whose View button 404s, with no way
  to tell what the file was meant to be.

The first is strictly better. Do not "clean this up" by reordering it.

---

## 2. Bring-up

1. **Postgres exists** on Railway (owner, 2026-08-24).
2. **`DATABASE_URL` must be set on the APP service**, not only on the Postgres service —
   Railway does not share variables between services automatically. Use a **reference**,
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`, so a rotated password does not go stale.
3. **The migration runs on deploy**, from `scripts/start.sh` — `railway.json`'s
   `startCommand` is just `bash scripts/start.sh`. It runs `prisma migrate deploy` **only
   when `DATABASE_URL` is present**, then execs the server.
4. **The four `R2_*` variables** — see `PLAYBOOKS/storage-r2.md`.

### Verifying

- Signed out, `/deal-room` and `/api/deals` → 307 to `/sign-in`.
- Signed in, `/deal-room` renders "Create New Deal". A red notice naming `DATABASE_URL`
  means step 2 was missed.
- Create a deal → it appears in the list as `Deal <n> · Fund 1`.
- Drop a PDF, type a description, Upload → the row appears with **View**, and View downloads
  the file as an attachment.

---

## 3. GOTCHAS

**GOTCHA 1 — Prisma 7 removed `url` from `schema.prisma`.**
Migrate reads it from `prisma.config.ts`; the runtime client takes a `PrismaPg` **driver
adapter** (`src/lib/db.ts`). Adding `url = env("DATABASE_URL")` back to the schema is a
validation error, not a fix.

**GOTCHA 2 — `prisma.config.ts` reads `process.env`, not Prisma's `env()` helper.**
`prisma generate` runs in `postinstall`, which runs in **CI, where no secrets are set**. The
helper treats a missing variable as an error; a plain read yields `undefined`, which the
config type permits and which `generate` does not need. Swap it for `env()` and CI goes red
on a repo that is fine.

**GOTCHA 3 — the migrate step is guarded on `DATABASE_URL` for a reason.**
Ungated, a deploy without the variable fails `prisma migrate deploy`, fails the healthcheck,
and takes the **live site** down — including the public landing page, which needs no
database at all. The guard is what makes the database optional to boot. Note the asymmetry:
a *missing* variable skips the migration, but a *failing* migration is fatal by design
(`set -e`) — a half-migrated schema serving traffic is worse than a failed deploy, and
Railway keeps the last good container.

**GOTCHA 3a — `prisma` is a RUNTIME dependency, not a dev one, and must stay that way.**
`scripts/start.sh` runs `prisma migrate deploy` at boot. As a devDependency it is not
guaranteed to survive a production prune, and the failure mode is not a missing migration —
it is the start command exiting non-zero, the healthcheck failing, and the whole site going
down. Moving it back to `devDependencies` to tidy the runtime image is the change that looks
harmless and is not.

**GOTCHA 3b — migrations cannot run at BUILD time.**
The database is on Railway's private network (`postgres.railway.internal`), which build
containers cannot reach. Boot is the only moment that has both the schema and a route to the
database. Do not "optimise" this into the build command.

**GOTCHA 4 — the fund seed fixes the SERIAL sequence, and must.**
`INSERT INTO "Fund" ("id") VALUES (1)` does **not** advance the id sequence, so the first
fund created through the app would try to reuse id 1 and violate the primary key. The
migration's closing `setval` is not decoration.

**GOTCHA 5 — `/deal-room` is `force-dynamic`, and needs to be.**
It queries Postgres in a server component. Without it Next would try to prerender at build
time, and CI builds with no `DATABASE_URL`.

**GOTCHA 6 — the initial deal list is a PROP, not a mount fetch.**
React 19's `react-hooks/set-state-in-effect` rejects a state update driven by an effect on
mount. Loading on the server removes the effect, the loading state and a round trip. Every
fetch in `DealRoom.tsx` hangs off a user action. Re-adding a `useEffect` that fetches will
fail `npm run lint`.

**GOTCHA 7 — investor-facing upload is refused at the API, not just disabled in the UI.**
Nothing serves the `investors/` prefix. A file written there is readable by nobody, on a
screen that looks like investors have access. The audience becomes an input when the
authorization layer lands — see DECISIONS 2026-08-24.

**GOTCHA 8 — uploads are buffered and capped at 25MB.**
`MAX_UPLOAD_BYTES`. The size is checked before *and* after buffering, because `File.size` is
the client's declaration rather than a fact about the bytes that arrived. Raising it
meaningfully means `@aws-sdk/lib-storage`'s multipart `Upload`, not a bigger number.

---

## 4. Deliberately not built

- **Investor access.** The blocker is authorization, not storage. `src/proxy.ts` asks only
  whether somebody is signed in.
- **Delete.** No route removes a deal or a document. Fund records are not a thing to make
  easy to destroy; add it when there is a real need and decide then whether it is a soft
  delete.
- **Positions, marks, valuations.** Still blocked on a person — see `STATE.md`.
- **Any test runner.** The pure functions in `src/lib/r2.ts` were exercised by a throwaway
  harness, not by a suite that runs in CI. That gap is real and named here rather than
  implied.
