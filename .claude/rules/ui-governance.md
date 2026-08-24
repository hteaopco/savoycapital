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

Twelve rules, wired into `npm run verify` and therefore into CI on every PR.

| Rule | Proves |
|---|---|
| `raw-hex` / `raw-rgba` | Every color came from the `C` palette. |
| `input-number` | `type="text" inputMode="numeric"`, never `type="number"`. |
| `foreign-icons` | lucide-react is the only icon library. |
| `shadcn-import` | No shadcn components or class tokens. |
| `tailwind-theme` | Color, radius, shadow, weight and type size are inline styles off `C` — not Tailwind classes. |
| `radius-scale` | `borderRadius` is on `DESIGN_SYSTEM.md` § 2's scale: 4 / 6 / 8 / 10 / 12 / 16 / 999. **There is no 7.** |
| `inline-svg` | No hand-rolled icon SVG. A chart or logo is fine and says so at the call site. |
| `cursor-pointer` | No per-element cursor where `globals.css` already covers it. |
| `breakpoint-floor` | No breakpoint reaches below 768px. |
| `font-family-literal` | `fontFamily: "inherit"` everywhere but the root layout. |
| `mirror` | `design/palette.ts` and `src/components/palette.ts` are byte-identical. **Hard — no baseline, no waiver.** |

### `npm run lint:mobile` — the other lane

Five rules, baseline `{}`, wired into `verify` and CI (2026-08-24). design-lint proves mobile
work never breaks desktop; **mobile-lint proves desktop work never quietly breaks mobile.**

| Rule | Proves |
|---|---|
| `tap-target` | A `<button>` / `<a>` / `<Link>` states the 44px touch floor. `globals.css` floors form controls only — `button` is excluded so § 0.8's 36px carve-out survives. |
| `fixed-width` | No inline `minWidth ≥ 300` — it cannot fit a 375px phone's ~297px of usable width. `maxWidth` is safe and unchecked. |
| `table-overflow` | A `<table>` has a scroll wrapper. Without one the whole **page** tears sideways — breakage, not an improvement. |
| `table-label` | A table's first column is pinned, or it renders as cards. Scrolling ≠ broken, so this one is an improvement — but a new table owes it in the PR that adds it. |
| `column-count` | `column-count` does not collapse on its own. In TSX it can never respond to a breakpoint at all. |

Waivers are `// mobile-ok: <reason>`, reason required, same ratchet semantics.

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

- **A token used for the wrong role.** `C.overlay` as a shadow. Color = meaning, never
  decoration (`DESIGN_SYSTEM.md` § 0.3) is a semantic claim no regex reaches.
  **The standing rule this repo settled on: a badge's tone encodes STATE, never category.**
  Instrument type is neutral; "Current" is green because green means a positive state. The
  donut keeps accent and green as *arc identity* — a chart is a separate vocabulary the
  design system has no words for. That rule exists because `C.green` once meant "Private
  Credit" in the portal and "Current" on the public page, with every rule passing.
- **Type size off the § 2 type scale.** Not linted: § 2 gives ranges ("Body 12-13px",
  "Stat number 16-22px") rather than a set, and the public surface deliberately sits outside
  it (`src/components/type.ts`). A rule here would be guesswork.
- **Spacing off the § 2 spacing scale — and this one is a trap.** § 2 lists
  `4, 6, 8, 10, 12, 16, 20, 24` and says anything else needs a written exception. But § 3's
  **own primitives** ship `padding: "10px 14px"` and `"48px 16px"`. The canon does not hold
  itself to that scale for component-internal padding, so **there is deliberately no
  `spacing-scale` rule** and off-scale padding inside a component is not a finding. Treat § 2
  as layout rhythm. Measured before concluding — the first read of this was a list of nine
  "violations" that were nothing of the kind.
- **Two screens that disagree.** The same concept badged two different ways on two
  surfaces; a heading scale that exists as a literal in two files. Consistency is
  cross-file and the lint is per-file. (Radius is the one case now mechanized — `radius-scale`
  catches an off-scale value, though still not *the wrong on-scale value* for a given role.)
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
  PR. **`npm run lint:mobile` now enforces the mechanical half of that** (2026-08-24): a new
  `<table>` without a mobile answer, an unfloored control, an ungated hard `minWidth`. What
  it cannot see — clipped controls, a flex child missing `minWidth: 0`, cards staying N-up,
  chip-row overflow — is still held by review, and § 3's limits still apply to it.

`md:` is the primary breakpoint. A second is allowed **above** it when derived from
arithmetic and shown at the call site (`FundAllocation.tsx`'s `2xl:` is the standing
example). Never below 768px — that one the gate does enforce.

## 5. `design/` is the source of truth, and divergence is recorded or it isn't real

`design/` defines the look; the app holds its own copy of the palette. When the app and
`design/` disagree, **`design/` wins and the component changes** — not the other way round
(`DESIGN_SYSTEM.md` § 9).

When two files inside `design/` disagree with each other, `DESIGN_SYSTEM.md` wins
(DECISIONS, 2026-08-24), and the resolution is written into the losing file's banner and
`design/README.md`'s divergence table **in the same PR**. Three such conflicts are already
resolved and banner-ed in `AP_DESIGN_REFERENCE.md` — Tailwind-for-spacing, the radius scale,
and the badge radius. **Read that banner before trusting a rule in that file**; it is the one
labelled READ FIRST and it was wrong here on three counts. An undocumented divergence turns
"carried from theAPlink" into a claim nobody can check, which is the only property that
folder has.

Amending `design/` is an owner call. Recording a divergence that already exists in shipped
code is not an amendment — it is making the doc honest — but say which one you are doing.

## 6. Open

- ~~No `lint:mobile`.~~ **Built 2026-08-24** — five rules, baseline `{}`, self-tested in CI
  ahead of the gate. It covers about half of `MOBILE_AUDIT_PLAYBOOK.md` § 3; the other half
  is still a person at 375px.
- **`tap-target` exists, and § 3's limit on it still stands.** mobile-lint checks that a
  `<button>` / `<a>` / `<Link>` **states** the 44px floor — a mechanism, not a geometry. A
  `min-h-[44px]` losing to a conflicting inline `height` passes the gate and is still wrong,
  and a clickable `<div>` wrapping a whole card is deliberately out of scope because a regex
  cannot tell it from a 6px one. Measured by eye at 375px, per § 3.
- **No `spacing-scale` or `type-scale` rule**, and per § 3 that is a conclusion rather than a
  backlog item — both would encode a rule the canon does not hold itself to.
