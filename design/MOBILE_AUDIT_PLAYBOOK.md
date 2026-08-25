# Mobile Audit Playbook — how a "go" sweep works

> ### ⚠️ savoycapital divergence — this file is no longer identical to theAPlink's
>
> **Amended 2026-08-24, owner.** Carried byte-for-byte from theAPlink. **The method is the
> keeper — the rubric in § 3 and the triage in § 4 are the reason this file exists.** What
> does not carry is the machinery the loop is wired to and two of its invariants:
>
> | § | theAPlink | savoycapital |
> |---|---|---|
> | header, § 0.1 | Desktop frozen; every fix gated so desktop is byte-identical | **Mobile-first; neither surface frozen.** A change outside a mobile branch is ordinary work, not a defect |
> | § 0.2 | Money-safety: never touch a cents value, a posting path, a QBO writer | **No money-writing surface exists.** The invariant that binds here is the **auth boundary** — never widen `src/proxy.ts`'s public list to make a layout easier |
> | § 1.1, § 6 | Start from `--report`; `verify` runs seven gates; `prisma generate` for drift | **One gate, no Prisma.** `npm run verify` is typecheck + eslint + **design-lint** (2026-08-24, #20) and CI adds `npm run build`. `lint:design --report` is a real starting point for a *design* sweep; there is still **no mobile lint**, so a mobile sweep starts from the diff |
> | § 6 | Merge on green via an auto-merge cron | **Merge-on-green is standing authorization** (owner, 2026-08-24) — no cron; merge directly on `clean` |
>
> The audit surface is also different in kind: theAPlink is one internal portal, savoycapital
> is **a public marketing page plus a private portal**, and `design/README.md` supplies no
> patterns for the first. See `.claudet/AGENTS/MOBILE.md` for the seat, `.claudet/DECISIONS.md`
> for rationale.
>
> **If you are diffing this file against theAPlink's, these are the expected differences.**
> Do not "restore" it, and record any further divergence here *and* in `design/README.md`.


> The repeatable process behind each mobile pass on theAPlink. Desktop (≥768px) is
> the frozen primary surface; mobile (≤767px) is an **additive** layer. Every change
> is gated so the desktop DOM/paint is **byte-identical**. Read this with
> `design/MOBILE_REFERENCE.md` (the pattern library) — this doc is the *method*,
> that doc is the *vocabulary*.

> **savoycapital: `npm run lint:mobile` does not exist here** — though `scripts/` is no
> longer empty, it holds `design-lint.mjs` (#20, 2026-08-24) and not a mobile one — so the
> block below describes a gate we do not have. Read it as the spec to build to; `design-lint`
> is the nearest working example of the shape it should take. In the meantime run the *whole*
> rubric in § 3 by eye rather than the half the gate cannot see.
> The § 4 triage principle in the last paragraph of this block is the durable part, and it
> holds with or without a linter.

> **`npm run lint:mobile` now backs part of this method.** The gate mechanically catches
> five rubric items — §3A page-tearing tables, §3B unpinned label columns, an ungated fixed
> side panel, a `column-count` that doesn't collapse, and §3G sub-40px *non-button* tap
> targets — and it blocks **new** ones in the PR that adds them. Two consequences for the
> loop below:
>
> - **§1 step 2 changes.** "Diff since the last merge" is no longer load-bearing for those
>   five: regressions can't accumulate between sweeps any more. Start from
>   `node scripts/mobile-lint.mjs --report` instead — it lists exactly what's outstanding,
>   by file, already split into breakage vs improvement.
> - **§3 is where the value now is.** The gate is blind to clipped controls, a flex child
>   missing `minWidth: 0`, cards staying N-up, chip-row overflow, long unbroken strings, a
>   modal that fits but isn't a sheet, and tree indentation eating a sticky label. Those
>   need a person reading the screen — which is what a sweep is for.
>
> The §4 triage principle is what shaped the gate, not the other way round: `table-overflow`
> and `table-label` are two separate rules **because** "scrolling ≠ broken", and collapsing
> them into one number overstated the backlog 3× (21 tearing vs 65 unpinned).

---

## 0. The contract

**"go"** = pull latest → audit mobile on everything new/changed since the last pass →
fix end-to-end → verify → PR → merge on green → report which pages changed and how.

Two invariants that override everything else:

1. **Desktop must not change.** If a change is visible at ≥768px, it's a bug. Every
   fix is gated behind `useIsMobile()` (JS), a Tailwind `md:` prefix, or a
   `@media (max-width:767px)` rule. The pattern is always
   `isMobile ? mobileStyle : <exact existing desktop style>` — never re-theme the
   desktop branch, never gate a desktop style behind `isMobile`.
2. **Money-safety is untouchable.** Mobile work is presentational. It never edits a
   cents value, a posting path, a QuickBooks writer, or business logic. Sticky
   columns, wrapping, and sheets are pure layout.

> **savoycapital: invariant 1 does not apply, and invariant 2 is replaced.**
>
> **On 1:** desktop is not frozen here — both surfaces are being authored at once, mobile-first
> (`DESIGN_SYSTEM.md` § 1.1). A changed line outside a mobile branch is normal. What survives
> is the *discipline* behind the rule: know which widths each change affects and say so, and
> never let a mobile fix silently re-theme a desktop the owner has already signed off. The
> `SiteNav` wordmark comment is the standing example — "making it clickable would be a change
> to a surface the owner has already signed off, smuggled in under a refactor."
>
> **On 2:** there is no money-writing surface in this product — no posting path, no QBO
> writer, nothing that moves a dollar. Money is still **integer cents formatted at render
> with `tabular-nums`** (`FACTS.md`), and that stays. The invariant with real teeth here is
> the **auth boundary**: `/portal` is closed by `src/proxy.ts`, and no layout problem is ever
> solved by widening its public-route list. That file belongs to the Clerk seat
> (`.claudet/AGENTS/CLERK.md`) — if a mobile change seems to need it, raise it, don't edit it.

---

## 1. The loop (every sweep, same order)

1. **Reset to fresh main.** `git fetch origin main && git checkout -B <branch> origin/main`.
   Never build on a stale tip — main moves fast (multiple agents/day). **savoycapital: this
   holds verbatim**, and for the same reason — several seats work this repo.
   The mobile seat's branch is named in `.claudet/AGENTS/MOBILE.md`.
2. **Diff since the last merge.** Find what's new:
   - New component/page files: `git diff --name-status <lastSHA>..HEAD -- 'src/**/*.tsx'` → `^A`
   - Biggest changed files: `git diff --stat …` sorted by churn.
   - This defines the audit surface. Ignore pure backend/route/lib churn — only
     files that render UI matter.
   - **savoycapital: this step is the whole starting point**, since there is no
     `--report` to lean on. The UI surface is small enough to enumerate by hand today —
     `src/components/**` and `src/app/**/page.tsx` — so a sweep can legitimately audit
     *everything* rather than just the diff, and should, until it can't.
3. **Fan out audits.** One read-only `Explore` agent per file or tight group, each
   given the same rubric (§3). Parallel, because these are large files and the
   conclusions matter, not the file dumps. Group by area (e.g. "the six run modals",
   "KPI panel + its financials wrapper").
4. **Triage the findings** into *real breakage*, *convention gaps*, and
   *already-safe* (§4). Fix the first two; note the third.
5. **Implement**, reusing the established primitives (§5). Gate everything.
6. **Verify:** `npm install` (deps drift), `npx prisma generate` (schema drift),
   then `npm run verify` (typecheck + eslint + tenant-scoping + design-lint).
   **savoycapital: `npm install` still applies** — a cold sandbox reports every import as
   TS2307, which is drift, not your diff. **There is no Prisma**, so no `generate` step.
   `npm run verify` is **typecheck + eslint + design-lint** (#20); CI additionally runs
   `npm run build`, which is not redundant — it is how this repo found its first two
   failures — plus `lint:design --self-test` ahead of the gate.
7. **Commit** with the correct identity, **push** (`--force-with-lease` only on your own
   branch whose history is *verified* already-merged — diff it against `origin/main` and
   find no difference first), open a **PR**, **merge on green**. No cron: merge directly on
   `conclusion: success` + `mergeable_state: clean`. See `CLAUDE.md`.
   **savoycapital: merge-on-green is standing authorization** (owner, 2026-08-24) and there
   is no cron — merge directly once `verify` is green and `mergeable_state` is `clean`.
   `--force-with-lease` applies for the same reason given: the seat's branch is reset from
   `origin/main` each time and carries already-merged history.
8. **Report** the pages touched and the fix for each; call out what was deliberately
   left as-is.

**Split when big.** If a sweep spans many large files, ship it as sequential PRs
(part 1 / part 2…), each reviewable on its own, merging one before starting the next
on a re-fetched main. Quality and small diffs beat one giant PR.

---

## 2. How I decide *what* to audit

- **New `*.tsx` under `src/components/**` or `src/app/**`** → always audit.
- **Heavily-changed existing UI files** → audit only the *new* sections (the agent is
  told the file is already partly adapted and to focus on the delta).
- **Sibling of an already-fixed component** (e.g. a new KPI/YOY panel next to
  `pnl-kpi-panel`) → check whether the same treatment was applied; devs often copy
  the pattern, sometimes partially.
- **Public/marketing pages** (`/hteao`, `/request-access`) → audit for plain
  responsiveness (they use their own layout, not the portal's `useIsMobile`).
- **Shared nav/shell changes** (`portal.tsx`) → usually free: the sidebar/drawer/tab
  bar is already mobile-adapted, a new link just rides along. Verify, don't re-fix.
- **Backend-only commits** (routes, `lib/`, schema, tests) → skip. No UI.

---

## 3. The audit rubric — what every sweep looks for

Ordered by severity. The first two *break* the page; the rest are ergonomics/consistency.

> **savoycapital: audit at 375 AND 390 AND 430, not 375 alone (2026-08-25).** This rubric
> and § 5's toolkit both reason from "a 375px phone". A flex row whose fixed-width children
> nearly fill it behaves differently a few pixels either side of that: the Fund & Users row
> was clean at 320/360/375 and crushed a name to 2px at 390/393/414/430. 375 is the *tightest*
> width, which makes it the right one for overflow — and the wrong one on its own for a row
> that only breaks once there is *enough* room for every fixed child to sit on one line.

### A. Page-tearing horizontal overflow (highest priority)
- A `<table>` with a fixed `minWidth` / many `whiteSpace:nowrap` columns and **no
  `overflow-x:auto` wrapper** → the whole page scrolls sideways. **This is the #1
  real bug.** (A wrapped table that scrolls *inside its card* is fine.)
- A flex row of buttons/controls with `flexShrink:0` (or no wrap) inside a
  `justify-between` / `overflow:hidden` container → controls run off-screen or get
  **clipped** (clipping is worse than scrolling — the control is unreachable).
- A fixed side panel (`width: 340`) sitting beside content in a `flex-row` → forces
  the section wider than the viewport.
- A fixed pixel width > ~360px on any container; a `minWidth` on a flex child that
  can't shrink (missing `minWidth: 0`).
- **The inverse, which is easier to miss: a flex child that CAN shrink, to nothing.**
  `flex-1` sets `flex-basis: 0`, so a `min-w-0 flex-1` block yields all its width to
  fixed-width siblings. Two `minWidth: 150`-ish selects in the same row will take the whole
  line and leave the flexible child a couple of pixels. It does not tear and no gate sees it
  — the child just becomes unreadably narrow. Give it `w-full md:w-auto` so it takes its own
  line on a phone.
- CSS that *looks* responsive but isn't: `column-count: N` does **not** collapse on
  its own (a real trap); a comment claiming it does is a red flag.

### B. Wide table with no pinned label (the core UX ask)
- A dense/action/matrix table that scrolls horizontally but whose **first column
  (the row's identity) scrolls away** → you lose which row each number belongs to.
  Wants a mobile-gated **sticky first column**.
- Tree/indented tables that keep per-depth `paddingLeft` on mobile → indentation
  eats the label's width inside the sticky cap. Drop the indent on mobile.

### C. Modals
- A centered fixed-width dialog with no mobile gating → cramped, floats mid-screen.
  Wants a **bottom sheet** on mobile (`sheetBackdrop/sheetCard` for full-height
  flex-scroll modals; `sheetBackdropTop/sheetCardTop` for short/top-aligned ones).

### D. Cards / stat rails
- A fixed multi-column grid (`gridTemplateColumns: "1fr 1fr"`) or a flex row of
  fixed-width cards that stays N-up and cramped on a phone → stack full-width on mobile.
- `whiteSpace:nowrap` on a big currency value in a narrow card → can clip.

### E. Chip / tab rows
- A row of filter chips or sub-tabs that **wraps to many lines or overflows** →
  make it a single horizontal-scroll strip (`.ap-chip-strip`: `flex-nowrap` +
  `overflow-x:auto` + per-chip `flexShrink:0` + hidden scrollbar).

### F. Inputs & pickers (governance rules)
- `<input type="number">` is **banned** → must be `type="text"` + `inputMode`.
- A bare `<select>` used as a searchable list picker → must be the full-text
  `SearchSelect` (native selects only match first-letter). A short *fixed* enum may
  stay a `<select>` with a `// design-ok` waiver.
- Long unbroken strings (filenames, URLs, account names) with no `overflowWrap`/
  ellipsis → can push a row past the viewport.

### G. Touch targets
- Controls under ~40px tall. **Usually already handled** — the global
  `@media (max-width:767px)` block floors `button`/`[role=button]` to 40px height and
  inputs to 42px. So a "22px button" is vertically fine; only genuinely tiny/​width-
  starved icon buttons are worth a note. Don't chase these.

### H. Detail views
- An inline or centered detail that should feel like "opening a page" on a phone →
  full-screen sheet with a sticky Back bar.

Also recorded per audit: **does the file use `useIsMobile()` / `md:` / `@media` at
all?** — that's the baseline that tells me whether everything below is unmitigated or
just has gaps.

---

## 4. Triage — the judgment call

Findings sort into three buckets, and the discipline is knowing which is which:

| Bucket | Definition | Action |
|---|---|---|
| **Real breakage** | Page tears sideways, or a control is clipped/unreachable on a phone | **Fix now** |
| **Convention gap** | Works (scrolls/wraps) but inconsistent with the pattern — e.g. a wide table that scrolls but doesn't pin its label; a modal that fits but isn't a sheet | **Fix** when cheap and it serves the core ask (label visibility); otherwise note |
| **Already safe** | `flex-wrap` + `minWidth:0` already reflow it; the global touch floor covers height; it's a short modal that fits `min(Npx,100%)`; an inline non-tabular list | **Leave it, say so** |

Guiding principles for the gray zone:
- **Scrolling ≠ broken.** A table wrapped in `overflow-x:auto` is functional. Pinning
  its first column is an *improvement*, not a bug fix — worth it for the primary/widest
  tables, deferrable for secondary ones.
- **Report what I deliberately skip.** "Left as scroll-only: the six run-modal tables
  (they scroll, functional)" — silence would read as "covered everything."
- **Don't pad the diff.** Small in-cell buttons, a modal that already fits, a list that
  already wraps — calling these out and *not* touching them keeps the change tight and
  the desktop risk near zero.

---

## 5. The fix toolkit (reuse verbatim, always gated)

- **Sticky first column** — the workhorse for dense/matrix tables:
  ```ts
  const stickyFirst = (on: boolean, bg: string): React.CSSProperties =>
    on ? { position: "sticky", left: 0, zIndex: 1, background: bg } : {};
  ```
  Applied to the first `<th>` and every first `<td>` (body + total/special rows), each
  with a background that **matches its row** (striping, red rows, `bgAlt` totals) — a
  transparent sticky cell shows scrolling content underneath. Two-column pin (e.g. a
  chevron + a label) uses cumulative `left` offsets (`0`, then the chevron's width).
- **Table scroll wrapper** — wrap any bare wide table: `<div style={{ overflowX: "auto" }}>`,
  and give the containing flex card `minWidth: 0` so it can shrink.
- **Card-per-row** — for list screens, `MobileCard`/`MobileCardList`; the card is the
  tap target that opens the detail (no side-scroll, no wide first column).
- **Bottom sheet** — `sheetBackdrop`/`sheetCard` (full-height flex-scroll) or
  `sheetBackdropTop`/`sheetCardTop` (edge-to-edge top-aligned), spread onto the existing
  backdrop/card: `style={{ ...existing, ...(isMobile ? sheetCard : null) }}`.
- **Chip strip** — `.ap-chip-strip` + inline `flex-nowrap`/`overflow-x:auto`/per-chip
  `flexShrink:0`.
- **Stack a fixed side panel** — `flexDirection: isMobile ? "column" : "row"`, side
  panel to full width, vertical rule → horizontal rule.
- **Wrap a dense control row** — `className={isMobile ? "flex items-center flex-wrap" : "flex items-center"}`.
- **Stack a header** — title over a full-width action row: `flex-col items-stretch` on mobile.
- **Drop tree indentation** — `paddingLeft: isMobile ? base : base + depth * N`.
- **Break long strings** — `overflowWrap: "anywhere"` + `minWidth: 0`.
- **Pin a form trapped in a wide table** — on mobile wrap it in
  `position: sticky; left: 0; width: calc(100vw - <pad>)` so its fields reflow into view.
- **Public page (no `useIsMobile`)** — use a class + a `@media (max-width:767px)` rule
  in `globals.css` (keeps the desktop value exact, overrides only ≤767px).
  **savoycapital: this is the normal case, not the exception** — nothing here uses
  `useIsMobile`, and `globals.css` has no `@media (max-width:767px)` block yet. Prefer a
  Tailwind `md:` utility, which needs no new CSS and cannot desynchronize from the server
  render; reach for a `globals.css` block only for something a utility cannot express (a
  blanket floor, a `::-webkit-scrollbar` rule).

**Hooks-order gotcha:** put `const isMobile = useIsMobile()` **before any early
`return`** in the component, or eslint's rules-of-hooks fails.

---

## 6. Verify & merge

> **savoycapital: § 6 describes seven gates, a baseline and a cron. We have three gates and
> none of the rest.** `npm run verify` = **typecheck + eslint + design-lint** (#20, 2026-08-24).
> CI (`.github/workflows/ci.yml`) runs that plus `npm run build`, deliberately with **no
> secrets set** — the build passes without the Clerk keys, so a fork PR cannot leak them.
> **`design-lint` has a real baseline at `{}` and `--update` behaves as § 6 describes**, so
> the baseline discipline below is live for design and still a blueprint for mobile. There is
> no mobile-lint baseline to update, no tenant-scoping ratchet (this is one fund, not a
> multi-tenant product — `FACTS.md`), no tests, no Prisma and no auto-merge cron. Everything below
> about baselines and `--update` is the blueprint for a gate we have not built. The
> `mergeable_state` guidance **does** carry: `unstable` right after checks flip green is
> GitHub lag — merge on `clean`, and treat `dirty` as a conflict to rebase out.

- **Pre-push gate:** `npm run verify` = typecheck + eslint + tests + tenant-scoping
  ratchet + design-lint (no raw hex, lucide-only, etc.) + **mobile-lint** (the table-
  coverage ratchet, `scripts/mobile-lint.mjs`) + sheetjs. Green before every push.
- **mobile-lint is the other half of the gate.** design-lint enforces *mobile never
  breaks desktop*; mobile-lint enforces *desktop never quietly breaks mobile* — a new
  `<table>` must arrive with a mobile branch (or a `// mobile-ok: <reason>` waiver) in
  the same PR. It splits the two table findings the same way this playbook does:
  `table-overflow` (no scroll wrapper → **page tears**, real breakage) vs `table-label`
  (scrolls but the label column scrolls off → improvement). It also gates
  `fixed-width` / `modal-width` / `column-count` at zero — the traps in §3A/D/F are now
  mechanical, so I don't have to catch them by eye. `node scripts/mobile-lint.mjs
  --report` prints the coverage profile and the worklist (worst files first).
- **When a sweep improves table coverage, update the mobile-lint baseline.** Wrapping
  or pinning a table shrinks its rule count, and the ratchet then *fails* with "coverage
  IMPROVED — tighten the ratchet." So after the fixes and before committing, run
  `node scripts/mobile-lint.mjs --update` and commit the changed
  `scripts/mobile-lint-baseline.json` alongside the code. The baseline only ever moves
  down; fully covering a table (wrap **+** pinned first column, so `stickyFirst`/
  `isMobile` sits near it) drops it out of *both* rules rather than moving it from
  `table-overflow` into `table-label` — prefer that so total uncovered actually falls.
- **Sandbox drift:** a cold sandbox often needs `npm install` (new dev-deps like
  `vitest`/`tsx`) and `npx prisma generate` (schema advanced on main) *before* verify
  passes. A `vitest`-not-found or `apXxx does not exist on PrismaClient` error is drift,
  not my code.
- **Merge on green** (standing authorization): required checks (`verify` + `migrations`)
  passing, mergeable, no change-requested review. Poll via a `*/3 * * * *` cron.
  - `migrations` flakes on a transient Docker Hub pull timeout
    (`registry-1.docker.io … Client.Timeout`) — that's infra, not the diff; re-run the
    failed job.
  - `mergeable_state: unstable` right after checks flip green is GitHub lag — wait for
    `clean`, don't merge on `unstable`.
  - `dirty` = conflict → rebase onto fresh main, resolve, re-verify, force-push.
- **Branch hygiene:** because prior merged PRs leave their commits on the feature
  branch, reset to `origin/main` each sweep and `--force-with-lease` push; a new PR off
  the reset branch shows only the current diff.

---

## 7. The report (what the user gets back)

Every sweep ends with: **which pages changed and how**, one line each, plus an explicit
**"audited, already safe (no change)"** list and any **deliberately deferred** items.
Plus any standing infra note (e.g. the setup-script deps). The PR diff is the record;
the report is the readable summary.

---

## 8. One-line mental model

> New surface since last merge → does it tear sideways or clip a control? fix that
> first. Does a wide table hide its row label, a modal float centered, cards stay
> cramped, a chip row overflow? pin / sheet / stack / strip it — on mobile only,
> desktop frozen. Everything money- or logic-shaped stays untouched.
