# DECISIONS — savoycapital

Record real, load-bearing decisions here: **what + why + date.** The bar is "someone would
otherwise re-litigate this" — not every choice, just the ones that cost something to
reopen. Read the headers before working in an area.

Newest first.

- **A spaced secondary control may sit at 36×36px (owner, 2026-08-23).** § 0.8 and § 9's
  blanket ≥44×44px tap-target floor now carves out a control that is *all* of: secondary, at
  least 8px clear of its neighbours, and not repeated in a dense list. The carousel arrows are
  the case it was written for.
  - **What this costs, stated plainly.** 44×44px is the comfort standard — WCAG 2.1 AAA
    (2.5.5) and both platform HIGs. 36px is below it. It is **not** a violation of WCAG 2.2 AA,
    whose minimum (2.5.8) is 24×24px, so this is a defensible trade rather than a reckless one
    — but it is a trade, and it lands on touch users first.
  - **36px is a floor, not a new default.** Primary actions, list rows, form controls and
    anything a thumb hits repeatedly stay at 44. If this size starts appearing on those, the
    exception has been misread.
  - **Both statements of the rule were amended**, § 0.8 and § 9. A design system that
    contradicts itself in two places is worse than one that says the wrong thing once.

- **The design system may diverge from theAPlink, but only on the record (owner, 2026-08-23).**
  The first amendment: `DESIGN_SYSTEM.md` § 0.8's blanket "no animations over 200ms" now
  carves out a **content crossfade** at up to 400ms. UI feedback — hover, press, open, close —
  keeps the hard 200ms ceiling, so the carve-out cannot spread to the things the rule exists
  to protect.
  - **Why amend rather than override locally.** The portfolio carousel needed 400ms and got
    200ms on the first pass purely because the rule said so; at 200ms a full paragraph
    swapping reads as a flicker. A one-off override in a component would have left the
    codebase quietly contradicting its own design system, which is the failure mode this repo
    keeps legislating against. Changing the rule where the rule lives is the honest version.
  - **The cost, stated plainly:** `design/` was byte-identical to theAPlink's and now is not.
    Nine of ten content files still are. The tenth carries a banner naming the divergence, and
    `design/README.md` carries the table. **Every future divergence goes in that table** —
    otherwise "carried from theAPlink" becomes a claim nobody can check, and a checkable claim
    is the entire value of the folder.
  - **This does not license re-theming.** The palette, the primitives and the patterns are
    still theAPlink's, still verbatim, still not up for reinterpretation.

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
