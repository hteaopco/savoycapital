# UI governance — the law for anything that renders

Scope: `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `src/components/**`,
`src/app/globals.css`, `tailwind.config.ts`, and `design/**`.

Owned by the design seat (`.claudet/AGENTS/DESIGN.md`). Mobile behaviour at ≤767px is
owned by the mobile seat (`.claudet/AGENTS/MOBILE.md`) — this file governs the contract
between them, not the inside of either lane.

> **How this file reaches you.** `CLAUDE.md` at the repo root points at `.claude/rules/` and
> is loaded into every agent's context, so the pointer is always in front of you — but the
> pointer is not the file. **Read this one deliberately before UI work.** Said plainly per
> `.claudet/README.md` rule 3: "it's in the rules folder" is not the same as "someone read
> it," and describing it as automatic would be the kind of claim that folder forbids.

---

## 1. Jett owns the UI. Flag before you touch it.

`design/DESIGN_SYSTEM.md` § 1: before modifying any file in UI scope — **even if the user
requested the task** — say so first:

> "Heads up — this task will modify UI files: [list]. These changes affect
> [colors/layout/styling/components]. Proceed?"

This is the one rule where "just do it, it's reversible" does not apply. A pixel change
nobody asked for is not a bug fix, and a design change smuggled in under a refactor is the
failure this rule exists to prevent. Copy edits and clear bug fixes are exempt.

Non-UI scope, modify freely: `src/app/api/**`, `src/lib/**`, `prisma/**`, `scripts/**`,
`docs/**`, `.claudet/**`, `.github/**`.

## 2. The gate: `npm run lint:design`

Ten rules, wired into `npm run verify` and therefore into CI on every PR.

| Rule | Proves |
|---|---|
| `raw-hex` / `raw-rgba` | Every color came from the `C` palette. |
| `input-number` | `type="text" inputMode="numeric"`, never `type="number"`. |
| `foreign-icons` | lucide-react is the only icon library. |
| `shadcn-import` | No shadcn components or class tokens. |
| `tailwind-theme` | Color, radius, shadow, weight and type size are inline styles off `C` — not Tailwind classes. |
| `cursor-pointer` | No per-element cursor where `globals.css` already covers it. |
| `breakpoint-floor` | No breakpoint reaches below 768px. |
| `font-family-literal` | `fontFamily: "inherit"` everywhere but the root layout. |
| `mirror` | `design/palette.ts` and `src/components/palette.ts` are byte-identical. **Hard — no baseline, no waiver.** |

**The baseline is `{}` and stays `{}`.** Every rule sits at zero, so the next violation
fails the build — that is the entire value. Waive a genuine exception at the call site with
a reason:

```tsx
// design-ok: <circle> is not covered by the global cursor rule
```

`--update` exists for after you have genuinely FIXED violations. **Never re-grow the
baseline to make a red build green.** If a rule is wrong, fix the rule and its fixture.

**New rule → new fixture in the same PR**, and mutate the thing it guards to confirm it
goes red before you trust it. `npm run lint:design -- --self-test` runs in CI ahead of the
gate for exactly this reason: a gate with a broken regex reads green forever.

## 3. What the gate CANNOT check — permanently the reviewer's job

The lint proves you used a palette token. **It cannot prove you used the right one.**
Everything below passes every rule and can still be wrong, so it is reviewed by a person,
every time:

- **A token used for the wrong role.** `C.overlay` as a shadow. `C.green` meaning
  "Private Credit" on one screen and "positive" on another. Color = meaning, never
  decoration (`DESIGN_SYSTEM.md` § 0.3) is a semantic claim no regex reaches.
- **Values off the documented scales.** Spacing outside `4, 6, 8, 10, 12, 16, 20, 24`;
  radius outside the § 2 scale; type size outside the § 2 type scale. `DESIGN_SYSTEM.md`
  requires a *written exception in that doc* for anything off-scale — the gate does not
  count them yet.
- **Two screens that disagree.** A card at radius 10 beside a card at radius 12; the same
  concept badged two different ways on two surfaces. Consistency is cross-file; the lint
  is per-file.
- **Tap-target geometry.** A control's real hit area is CSS + layout + content, not a
  string. `min-h-[44px]` is greppable; a 6px-tall button is not.
- **Whether a screen matches its exemplar** in `design/exemplars/`.
- **Whether a shared-component change moved an unrelated screen.** `SiteNav`,
  `PortalShell` and `FundAllocation` each render on more than one surface.
- **Dependency-driven visual regression.** A `lucide-react` or `tailwindcss` major can
  redraw or re-lay-out the whole product with every gate green. Measure the bump, don't
  read the release notes. Those two packages are the design seat's to review before merge.

## 4. The lane boundary

Desktop and mobile are two seats and the dangerous direction runs both ways:

- **Mobile work must not change desktop.** Branch with Tailwind `md:` (show/hide) or a
  `@media (max-width: 767px)` block. Never gate desktop styling behind a runtime mobile
  check — the desktop tree stays byte-identical, which is the whole safety model.
- **Desktop work must not break mobile.** A new screen owes its ≤767px view in the same
  PR. This repo has no `lint:mobile`, so that is held by review, not by a machine — and
  it is the gap most likely to produce the 20–40-PR rework cycle the mobile seat exists to
  prevent. Building `lint:mobile` closes it.

`md:` is the primary breakpoint. A second is allowed **above** it when derived from
arithmetic and shown at the call site (`FundAllocation.tsx`'s `2xl:` is the standing
example). Never below 768px — that one the gate does enforce.

## 5. `design/` is the source of truth, and divergence is recorded or it isn't real

`design/` defines the look; the app holds its own copy of the palette. When the app and
`design/` disagree, **`design/` wins and the component changes** — not the other way round
(`DESIGN_SYSTEM.md` § 9).

When two files inside `design/` disagree with each other, `DESIGN_SYSTEM.md` wins
(DECISIONS, 2026-08-24), and the resolution is written into the losing file's banner and
`design/README.md`'s divergence table **in the same PR**. An undocumented divergence turns
"carried from theAPlink" into a claim nobody can check, which is the only property that
folder has.

Amending `design/` is an owner call. Recording a divergence that already exists in shipped
code is not an amendment — it is making the doc honest — but say which one you are doing.

## 6. Open

- **No `lint:mobile`.** § 4's second bullet is held by review only.
- **No off-scale value rules** (`spacing-scale`, `radius-scale`, `type-scale`) and no
  `inline-svg` rule. The first three need the scale contradictions in § 5 resolved before
  they can be written truthfully; `inline-svg` needs one `design-ok:` line added to
  `FundAllocation.tsx`, which is a UI-scope edit and therefore § 1 applies.
