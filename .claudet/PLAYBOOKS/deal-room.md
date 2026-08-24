# PLAYBOOK — the Deal Room

How deals and their documents are stored, and what will bite someone.

Subsystem status: **built, management-only.** Investor-facing upload is refused at the API.

---

## 1. Two stores, and which holds what

| Lives in | What | Why there |
|---|---|---|
| **Postgres** (Prisma) | Deal name, document description, filename, size, uploader, timestamps | Neither a name nor a description is a byte, and R2's list call returns keys and sizes but **not** custom metadata — a listing built on object metadata costs one request per file |
| **R2** | The bytes | It is an object store |

`Fund → Deal → DealDocument`. A document may sit in a **folder** — a nullable free-text
column on `DealDocument`, not a table (owner, 2026-08-24). A folder here has no properties of
its own: no owner, no description, no permissions, no nesting. A table would be a join that
buys nothing, and an empty folder is not a state worth representing. `NULL` means the top
level of the deal.

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

**GOTCHA 8 — delete removes the ROW first and the OBJECT second, the reverse of upload.**
Both orders serve one rule: **never leave a row without its object.** Upload writes R2 first
so a failure orphans an object; delete removes the row first for the same reason. The
opposite order leaves a document on screen whose View button 404s, with nothing left to say
what the file was. If R2 is unconfigured or the object delete throws, the row still goes and
the object is left — refusing would keep a deleted document on screen over a variable that
has nothing to do with it.

**GOTCHA 8c — there is no `DELETE /api/files/<key>` any more, and adding one back is a bug.**
There was one when R2 was the only store. Every object under `management/funds/.../deals/...`
now has a `DealDocument` row, so a key-addressed delete removes bytes and strands the row.
That route is reached by an object key — the one identifier that cannot find its row without
a scan. Deletion belongs to `DELETE /api/deals/<dealId>/documents/<docId>`, which owns both
halves.

**GOTCHA 8a — folders are matched by exact string, so "UCC" and "UCC " are two folders.**
There is no normalisation beyond a `trim()`, and no rename. The mitigation is a `<datalist>`
of the deal's existing folder names on every folder input, so picking beats typing. If two
spellings do appear, the fix today is moving each document with the row's folder control —
which is also why that control exists.

**GOTCHA 8b — the multi-file upload is still ONE REQUEST PER FILE.**
The client posts sequentially and keeps going past a failure. Both halves are deliberate:
eight concurrent multipart posts is a self-inflicted thundering herd against one container,
and a batch that aborts on file three leaves the owner guessing which of eight landed. Every
row ends up done or carrying its own reason, and only failures stay staged. Do not "optimise"
this into one request carrying eight files — that reintroduces both problems and puts eight
files against a per-file 25MB ceiling.

**GOTCHA 8d — uploads are buffered and capped at 25MB.**
`MAX_UPLOAD_BYTES`. The size is checked before *and* after buffering, because `File.size` is
the client's declaration rather than a fact about the bytes that arrived. Raising it
meaningfully means `@aws-sdk/lib-storage`'s multipart `Upload`, not a bigger number.

---

### The deal's figures ARE the Portfolio chart, as of 2026-08-24

A deal carries five nullable columns beyond its name: `amountCents`, `investmentDate`,
`instrument`, `terms` and `fees`. The first three are not documentation — **the chart at
`/portal/portfolio` is built from them** (`src/lib/portfolio.ts`):

| Column | What it does on the chart |
|---|---|
| `amountCents` | The arc's length, and the holding row's figure |
| `instrument` | **Which arc.** `PRIVATE_EQUITY` → accent, `PRIVATE_CREDIT` → green |
| `investmentDate`, `terms`, `fees` | Rows in the View Details panel; omitted when null |

**A deal missing an amount or an instrument is named on that screen, not dropped.** It shows
in an amber "Not shown on the chart" line with what it needs. That is deliberate: a chart of
a fund's money that silently omits a position disagrees with this screen and says nothing
about it.

The editor opens by itself when any of the three is missing, which is the backfill path
(owner: *"can you make it to where i can backfill the values on first load"*).

**`terms` and `fees` are free text, capped at 500 characters.** What a position actually
holds — rate, term, amortisation for debt; ownership and basis for equity — is still blocked
on a person. A typed schema written to look thorough now is one the real schema starts by
undoing.

**Amounts are typed as dollars and stored as cents.** `parseDollarsToCents` is the only
converter and it runs on both sides of the wire; the input re-groups with commas on blur
only, never per keystroke (a caret that jumps mid-figure is worse than an ungrouped one).

---

## 4. Deliberately not built

- **Investor access.** The blocker is authorization, not storage. `src/proxy.ts` asks only
  whether somebody is signed in.
- **Folder rename.** Renaming one means updating every document carrying that string. It is a
  small route when someone wants it; until then the row control moves documents one at a time.
- **Nested folders.** One level only. Nothing has asked for a tree.
- **Deleting a DEAL.** Only documents can be deleted (owner asked for files, 2026-08-24).
  A deal delete would cascade to every document row and leave every object behind, so it
  needs the sweep below to exist first.
- **Undo, and any sweep for orphaned objects.** Both deletes are hard: the row is gone and
  the bytes follow. Nothing lists objects that no row points at.
- **Positions, marks, valuations.** Still blocked on a person — see `STATE.md`. `terms` and `fees` are the free-text stand-in and are not a schema for this.
- **Any test runner.** The pure functions in `src/lib/r2.ts` were exercised by a throwaway
  harness, not by a suite that runs in CI. That gap is real and named here rather than
  implied.
