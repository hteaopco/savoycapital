# DECISIONS — savoycapital

Record real, load-bearing decisions here: **what + why + date.** The bar is "someone would
otherwise re-litigate this" — not every choice, just the ones that cost something to
reopen. Read the headers before working in an area.

Newest first.

- **`design/` is excluded from the type-check and the linter (2026-08-23).** The exemplars
  are frozen `.tsx` snapshots carried byte-for-byte from theAPlink, and they import
  `@/components/accounting/palette` and `@/lib/accounting/...` — paths that exist there and
  not here. Left in `tsconfig.json`'s `include`, they fail the build with TS2307, which is
  exactly how this was found: on the first `next build` this repo ever ran. `design/` and
  `uploads/` are both excluded from `tsconfig` and ignored by ESLint.
  - **Do not "fix" the exemplars by rewriting their imports.** Their value is that they are
    identical to theAPlink's; editing them to compile here would destroy the only property
    that makes them a reference. Read them, copy patterns out of them, never compile them.
  - `design/README.md` says this too, at the point someone would trip over it.

- **`eslint-config-next` 16 is consumed as a native flat config, not through
  `@eslint/eslintrc` (2026-08-23).** It exports `Linter.Config[]` directly from
  `eslint-config-next/core-web-vitals` and `/typescript`. Wrapping those in
  `FlatCompat.extends()` — the shape older Next scaffolds use, and the one this repo was
  first written with — throws `Converting circular structure to JSON` before a single file
  is linted. The `@eslint/eslintrc` dependency was removed with it.

- **The app copy of the palette is a byte-identical mirror of `design/palette.ts`
  (2026-08-23).** `src/components/palette.ts` is the runtime module; nothing imports from
  `design/`. This is the mirror pair `design/README.md` describes, and it is currently held
  **by hand** — theAPlink's `npm run lint:design` gate, which makes the mirror real rather
  than aspirational, does not exist here yet. Build it before the pairs multiply.

- **theAPlink's multi-tenancy does not carry over (owner + reading of the brief, 2026-08-23).**
  Savoy Capital is **one fund with multiple investments and two authenticated users**, not a
  multi-tenant product. theAPlink's `Group → Company → Store` hierarchy, per-model
  `companyId` scoping, tenancy Prisma extension, and `check:tenant-scoping` ratchet all exist
  to serve 15–30 companies; none of them has a counterpart here. **Do not import them, and do
  not apply theAPlink's governing design test ("what does adding client #27 cost?")** — it
  is the right question for that product and the wrong one for this.
  - **What this does not license:** skipping authorization. Two users still means the private
    portfolio surface must be genuinely closed to the public one. "Only two people use it" is
    an argument against tenancy machinery, never against an auth boundary.
  - **The thing that does scale here is the investment count, and time.** The portfolio is
    monitored *over time*, so history is a first-class modeling concern from the first
    schema — see `FACTS.md`.

- **Design is carried from theAPlink verbatim, not re-derived (owner, 2026-08-23).**
  `design/` is byte-identical to theAPlink's, including its `AP_`-prefixed filename and its
  AP-domain exemplars. The alternative — extracting a "clean" brand-neutral subset — was not
  taken, because the value of the folder is that it is the *same* look, and a subset drifts
  the moment someone judges what's essential. Read the exemplars for structure; their
  subject matter is theAPlink's and means nothing here.
  - **What did NOT carry:** theAPlink's app code, Prisma schema and 134 migrations, the ten
    `scripts/` guardrail linters and their baselines, `.github/` workflows, `.claude/` hooks
    and rules, `docs/`, and the accumulated `.claudet/` content (LOG, DECISIONS, scoping
    audits). Structure carried; history did not.
  - **Consequence to remember:** `npm run lint:design` — the gate that makes "source of
    truth" true in theAPlink rather than aspirational — does not exist here. Until it does,
    the mirror rule is a convention held by hand, and `design/README.md` says so plainly.
