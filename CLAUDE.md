# savoycapital — house law

Savoy Capital: a public landing page and a private portfolio monitor for one fund and two
people. Next.js 16 / React 19 / TypeScript strict / Tailwind for layout only / Clerk /
Railway.

This file is what every agent carries in context. It holds the rules that must always be
loaded and **pointers to everything else** — it deliberately does not repeat what those
files say, because a second copy is a copy that goes stale.

| Read | For |
|---|---|
| `.claudet/README.md` | The working-memory convention and the four rules that make it work. |
| `.claudet/FACTS.md` | What the product is and the constraints that bind every design. |
| `.claudet/DECISIONS.md` | Settled calls, newest first. Read the area you're touching before reopening anything. |
| `.claudet/STATE.md` | What is mid-flight or blocked on a person. Goes stale between audits — verify against the code. |
| `.claudet/AGENTS/` | One charter per seat. **Find yours and read it first.** |
| `.claude/rules/` | The law for a domain. `ui-governance.md` binds anything that renders. |
| `design/` | The design source of truth. `AP_DESIGN_REFERENCE.md` first, every time, before any UI work. |

---

## Merge on green — standing authorization for every seat

> "merge on green, standing auth add it to your charter" — owner, 2026-08-24
>
> "you have a standing order to merge on green" — owner, 2026-08-24

**A green, mergeable PR of your own work gets merged without asking.** The owner has
granted this to every seat and should not have to grant it again. Asking anyway spends his
attention on a decision he has already made — and holding a green PR is the failure, not
the caution.

**What "green" means, precisely, because this is the part that goes wrong.** Read the check
run's `conclusion` yourself. A `check_suite.completed` event is not a pass — its own payload
says cancelled suites and suites with no runs are not covered. Confirm `conclusion: success`
**and** `mergeable_state: clean`, and re-fetch `origin/main` first; it moves under open
branches.

**The grant covers your own PRs only.** Another seat's PR is never yours to merge.

**Merge only what you would ship unreviewed, because that is what happens.** Railway deploys
`main`, so merged is live within a minute. CI cannot open a browser: it will not catch a
panel hanging off the right edge, a tap target under the floor, or a column that stopped
lining up. Your own pass is the gate CI is not.

**Still stop and ask**, standing grant or not, when the change would widen what the public
can see of the fund's numbers, when it touches the auth boundary (`src/proxy.ts`, an
instance setting, a new public route), when it amends `design/`, or when the owner has an
open question on the PR. Green CI does not answer any of those — they are permissions and
taste, and both are his.

## The seats

Specialized agents each hold a sole-focus domain. **If a task is in another seat's lane,
route it there rather than taking it.** Charters in `.claudet/AGENTS/`.

| Seat | Owns |
|---|---|
| `CLERK.md` | Authentication — the instance, the session boundary, the sign-in surface, DNS. |
| `CODER.md` | The build — components, screens, content, on both sides of the auth boundary. |
| `DESIGN.md` | The design system whole — palette and pattern fidelity, `design/`, the gate. |
| `MOBILE.md` | Mobile — every screen at ≤767px, both surfaces. |

## Before you push

```
npm run verify     # typecheck + eslint + design-lint
npm run build      # what CI also runs; catches what tsc alone does not
```

CI runs both on every PR, plus `npm run lint:design -- --self-test`.

## Two rules that override convenience

- **Jett owns the UI.** Before modifying `src/app/**/page.tsx`, `src/components/**`,
  `src/app/globals.css` or `design/**` — **even if the task requires it** — say so first.
  This is the one place "just do it, it's reversible" does not apply. Full rule:
  `.claude/rules/ui-governance.md` § 1.
- **Never `--force` or `--force-with-lease` on a branch someone else may hold.** If a push
  would need force, use a new branch name instead. The one exception is a branch of your own
  whose entire history is already merged, where you have verified that by diffing it against
  `origin/main` and found no difference.

## Don't assert an enforcement that doesn't execute

A doc claiming "X is checked" when nothing checks X is a lie the next reader will act on.
Say "convention, held by hand" instead. Same for counts: **never hand-write a number a
script can count** — it rots between the audits that were supposed to refresh it.
