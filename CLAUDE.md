# savoycapital

Savoy Capital — a public landing page and a private portfolio monitor for **one fund and two
people** (Rodney Savoy, Jett Dueitt). Design and conventions carried from theAPlink; the
architecture deliberately is not.

## Rules (in `.claude/rules/` — pointed at from here, not auto-injected)
- **UI governance & design fidelity** — `.claude/rules/ui-governance.md`. Read it before UI
  work; a pointer in your context is not the same as having read the file.

## DESIGN FIDELITY — non-negotiable
The visual design MUST be **identical** to the HTeaO / theAPlink look. Nothing different.
`design/` is the source of truth:
- `design/palette.ts` — the `C` palette. Every color comes from here; **no raw hex.**
- `design/DESIGN_SYSTEM.md` — the full design system. **It is the tie-breaker**: where two
  files in `design/` disagree, this one wins (DECISIONS 2026-08-24), and the losing file gets
  a banner plus a row in `design/README.md`'s divergence table in the same PR.
- `design/AP_DESIGN_REFERENCE.md` — the pattern cheat-sheet (tables, buttons, tabs, modals,
  cards, pills, inputs). **Read it before any UI work**, then the `DESIGN_SYSTEM.md` sections
  in scope — cite file:line, not memory.
- `design/MOBILE_REFERENCE.md` / `MOBILE_AUDIT_PLAYBOOK.md` — the ≤767px surface. **Read their
  banners first**; they are carried from theAPlink and amended, and § 6 in particular will
  mislead you about tap targets if you skip it.
- `design/exemplars/` — real screens to copy 1:1. **Never compiled** (excluded from
  `tsconfig.json` and eslint; they import paths that exist only in theAPlink).
Reuse patterns verbatim; never re-theme or invent a new style. **`design/` amendments are an
owner call** — recording a divergence that already exists in shipped code is not an amendment,
but say which one you are doing.

## Session setup
- `npm install` before editing/pushing — the sandbox starts with no `node_modules`, and a cold
  tree reports every import as TS2307. That is drift, not your diff.
- **Prisma IS here as of 2026-08-24** (owner: "Add a database"), and `npm install` runs
  `prisma generate` through `postinstall`. It needs **no database** — codegen reads the
  schema only, which is what keeps CI green with no secrets set. Prisma **7**: there is no
  `url` in `schema.prisma`; migrate reads `prisma.config.ts` and the runtime client takes a
  driver adapter (`src/lib/db.ts`). Do not "fix" the missing `url` by adding one back.

## Pre-Push Gate
Run **`npm run verify`** before every push: **typecheck + eslint + design-lint**
(`scripts/design-lint.mjs`). CI (`.github/workflows/ci.yml`) runs that chain plus
`npm run lint:design -- --self-test` and `npm run build` on every PR and on `main`.

`next build` is **not** redundant with `tsc` — it is how this repo found its first two
failures. CI deliberately sets **no secrets**: the build passes without the Clerk keys, so a
fork PR cannot leak them, and a change that makes the build need one is worth knowing here.

Ratchet rules: the design-lint baseline is `{}` on every rule and **stays `{}`**. Waivers are
`// design-ok: <reason>` on a line above the violation, reason required. `--update` is for
after you have genuinely fixed violations — **never to make a red build green.**
`node scripts/design-lint.mjs --report` prints the debt profile.
The **mirror gate is hard — no baseline, no waiver**: `design/palette.ts` and
`src/components/palette.ts` must be byte-identical.
**New rule → new fixture in the same PR**, and mutate the thing it guards to confirm it goes
red before you trust it. A gate with a broken regex reads green forever.

## NO HARDCODING — non-negotiable
Never bake a fund figure into a component. **No amounts, no position names, no dates of
marks, no percentages, no fund size** written as a literal inside `src/components/**` or
`src/app/**`. They belong in `src/content/**`, which exists for exactly this
(`src/content/fund-allocation.ts` is the pattern to follow).
- **Money is integer cents end-to-end**; format only at render, always with
  `fontVariantNumeric: "tabular-nums"`.
- **A derived figure is never supplied.** `FundAllocation` computes "Unallocated" as fund size
  less everything deployed, so the chart cannot show a split that fails to add up. The figures
  it was first built from arrived $10,000 over. Accepting a total as an input is how that ships.
- If you think a literal is genuinely unavoidable, **stop and get the owner's approval before
  writing it.** No silent literals.

## This is NOT a money-moving product — size the risk correctly, in the right direction
There is no payments integration, no QuickBooks, no ledger and no write path to anything
financial. **Nothing here can move a dollar.** Do not import theAPlink's money-safety framing,
its posting gates, or its urgency language — none of the mechanisms exist.

**The risk that IS real here runs the other way: disclosure.** `/portal` serves the fund's
size and position-level amounts. **Authentication** is still Clerk's
`sign_up.mode: "restricted"` — a dashboard toggle that nothing in this repo re-checks.
`/portal` shipped open for a day in August 2026 for a related reason.

**Authorization now exists, and it changes that risk rather than removing it**
(`src/lib/authz.ts`, 2026-08-24). A signed-in account with no role assignment sees **nothing**
— so if sign-up ever returned to `public`, a stranger who signed up would land unassigned and
reach no figures, where before they reached all of them. That is a real narrowing, and it is
**not** a reason to relax about the Dashboard toggle: it holds only while at least one
assignment exists. With the table empty the bootstrap valve treats everyone as management,
deliberately, because the alternative locks the owners out of their own portal with no way in
from here. `authz.ts`'s header is the full argument.

So the failure to be careful about is **a number reaching someone who should not see it** —
a route added outside `isPublicRoute`'s allowlist, a `noindex` dropped, a real figure moved
into a public component. Write it that way, and treat `src/proxy.ts` accordingly.

Separately and still open: `FACTS.md` § "securities marketing" — a public page marketing a
private fund is constrained by exemptions nobody here should guess at. **Confirm with counsel
before the public surface says anything about performance, returns or availability.**

## Working Memory & Docs
`.claudet/` — `FACTS.md`, `DECISIONS.md`, `STATE.md`, `BUGS.md`, `LOG.md`, `PLAYBOOKS/`,
`AGENTS/` (one charter per seat — read yours), `scoping/`, `archive/`. Conventions and the
four rules that make it work: `.claudet/README.md`.

- **Read `.claudet/DECISIONS.md` headers before proposing or starting work in an area —
  required, not optional.** It records load-bearing calls with their rationale, and it is the
  cheapest guard against the recurring failure where an agent re-litigates a settled call
  because it never read the decision. Skim the bolded headers; read the full entry before
  acting in the area it governs.
- **`STATE.md` goes stale between audits — verify a claim in it against the code before acting
  on it.** It has been wrong about the nav target, about `scripts/` being empty, and about what
  `verify` runs. That is the known cost of a hand-written file, not a defect to be surprised by.
- **Never hand-write a number a script can count.** Inventories rot between the audits that
  were supposed to refresh them. **This repo has no `state.mjs` / `changelog.mjs` generators
  and no session hooks** — theAPlink's generated-working-memory model is *not* in place here,
  so keep counts out of these files rather than writing ones that will go stale.
- **Don't assert an enforcement that doesn't execute.** A doc claiming "X is checked" when
  nothing checks X is a lie the next reader will act on. Say "convention, held by hand."
- **Falsify a written claim and you fix it in the same PR.** Landing `design-lint` made nine
  statements across `design/` and `.claudet/` false at once. That rule was already written down
  and was still missed on the PR that broke them — it is here because it does not enforce itself.

## The seats
Specialized agents each hold a sole-focus domain. **If a task is in another seat's lane, route
it there rather than taking it.** Charters in `.claudet/AGENTS/`.

| Seat | Owns |
|---|---|
| `CLERK.md` | Authentication — the instance, the session boundary, the sign-in surface, DNS. |
| `CODER.md` | The build — components, screens, content, on both sides of the auth boundary. |
| `DESIGN.md` | The design system whole — palette and pattern fidelity, `design/`, the gate. |
| `MOBILE.md` | Mobile — every screen at ≤767px, both surfaces. |

## Tech stack
Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind **for layout only** ·
lucide-react · inline styles off the `C` palette · Clerk auth · **Prisma 7 + Postgres**
(Railway) · **Cloudflare R2** for documents · Railway (Nixpacks, auto-deploy on push to
`main`, healthcheck `/api/health`, Node pinned by `.nvmrc`).

**Both data stores are OPTIONAL to the build and boot.** `DATABASE_URL` and the four `R2_*`
variables are read lazily; absent, the routes that need them answer **503** and every other
page serves normally. That is deliberate and load-bearing: CI builds with **no secrets at
all**, so a change that makes the build require one is a change worth noticing.

**Deliberately absent — do not scaffold these because theAPlink has them:** multi-tenancy
(one fund, two users — `FACTS.md` is explicit that *"what does adding client #27 cost?"* does
**not** apply here), QuickBooks, a test runner, a `/sign-up` route, Clerk webhooks,
`useIsMobile()`, `mobile-cards.tsx`, and `lint:mobile`.

**`Fund` in the schema is NOT a retraction of that.** It carries a `fundId` on the owner's
explicit call (2026-08-24) because investors will be scoped by fund, and it is one column and
one relation — no tenancy extension, no per-model scoping middleware, no
`check:tenant-scoping` ratchet. DECISIONS records why. Do not grow it into theAPlink's
apparatus.

## Git
- **Always rebase before starting work.** `git fetch origin main` and branch from
  `origin/main`. `main` moves fast — several seats merge daily.
- **Rebase before running the Pre-Push Gate — every time.** A verify run on an unrebased tree
  validates a tree that will never ship. When your branch carries only already-merged history,
  restart it from `origin/main` instead of rebasing.
- Develop on a feature branch; open a PR into `main`.
- **Never `--force` / `--force-with-lease`** on a branch anyone else may hold. If a push would
  need force, use a new branch name. **One exception:** your own branch whose entire history is
  already merged, **verified by diffing its tree against `origin/main` and finding no
  difference** — verify it every time; do not reason from "it was squash-merged, so it must be."

### Merge on green — standing authorization for every seat
> "merge on green, standing auth add it to your charter" — owner, 2026-08-24
> "you have a standing order to merge on green" — owner, 2026-08-24

**A green, mergeable PR of your own work gets squash-merged without asking.** The owner has
granted this to every seat and should not have to grant it again. **Reporting "it's green,
shall I merge?" when you already hold the authority is the failure this exists to stop** — and
so is inventing a reason the grant does not apply to you. It happened on #20.

**"Green" means:** the `verify` check's `conclusion: success`, `mergeable_state: clean`, no
unresolved change-requested review, `origin/main` re-fetched first. Your own PRs only —
another seat's PR is never yours to merge.

**An absence of signal is not a pass.** A `check_suite.completed` event is not a conclusion —
its own payload says cancelled suites and suites with no runs are not covered. Read the check
run's `conclusion` yourself. Do not merge while a check is red or still running, over a
conflict, or over a requested change.

**Merge only what you would ship unreviewed, because that is exactly what happens.** Railway
deploys `main` on merge. CI cannot open a browser: it will not catch a panel hanging off the
right edge, a tap target under the floor, or a column that stopped lining up. Your own pass is
the gate CI is not.

**Say when a PR went near these — one line in your reply, naming which.** They no longer
block, but they fail in ways CI cannot see, so the owner reads them after the fact and cannot
do even that if nobody says:
- `src/proxy.ts` — the auth perimeter and its public allowlist. The one control behind "the
  fund's numbers are not on the internet."
- `design/**` — the source of truth for every screen. An amendment here is still an owner call.
- `.github/workflows/**` and `scripts/design-lint.mjs` — CI and the design gate. **An agent
  editing its own gate is the change no gate can catch**, and the design seat owns that gate,
  which is precisely why it is on this list.
- `.claude/rules/**` and this file — what every future agent is told. It propagates to all
  seats invisibly.

### CI check-ins — 5 minutes max
`verify` finishes in well under a minute here. When waiting on it, never schedule a check
further out than 5 minutes; re-arm a short one rather than setting a long timer.

**The check-in must be something YOU do, not something you wait for.** A webhook subscription
or a background poller is a convenience, never the mechanism — it can be pointed at an
endpoint that fails, or simply never fire, and its silence is indistinguishable from "still
running." If the cadence elapses with no signal, go read the check status yourself.

## UI governance — the one rule where "it's reversible" does not apply
**Jett owns the UI.** Before modifying `src/app/**/page.tsx`, `src/app/**/layout.tsx`,
`src/components/**`, `src/app/globals.css`, `tailwind.config.ts` or `design/**` — **even if
the task requires it** — flag it first: *"Heads up — this task will modify UI files: [list].
These changes affect [colors/layout/styling/components]. Proceed?"* Copy edits and clear bug
fixes are exempt. No silent UI changes. Full rule: `.claude/rules/ui-governance.md` § 1.

Non-UI scope, modify freely: `src/app/api/**`, `src/lib/**`, `src/content/**`, `scripts/**`,
`docs/**`, `.claudet/**`, `.github/**`.
