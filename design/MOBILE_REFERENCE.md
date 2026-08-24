# theAPlink — Mobile Spec (source of truth for ≤767px)

> ### ⚠️ savoycapital divergence — this file is no longer identical to theAPlink's
>
> **Amended 2026-08-24, owner.** This file was carried byte-for-byte from theAPlink, where
> mobile was *retrofitted* onto a large frozen desktop surface backed by a linter, a hook and
> a primitives library. **savoycapital has none of that machinery, and nothing here is
> frozen.** Five rules are amended below. The patterns, the table decision tree and the
> vocabulary are untouched — those are why the file was carried.
>
> | § | theAPlink | savoycapital |
> |---|---|---|
> | header, § 2 | Desktop is frozen; mobile is an additive layer | **Mobile-first.** Neither surface is frozen — both are authored at once, at 375px first (`DESIGN_SYSTEM.md` § 1.1) |
> | § 1 | Exactly one breakpoint; `sm:` / `lg:` / `min-width` rejected by lint | `md:` (the 767/768 line) is the primary boundary. **A second breakpoint is allowed** when it is derived from arithmetic and shown at the call site |
> | § 1, § 3, § 4 | `useIsMobile()`, `MobileCard`, `sheetCard`, `.ap-chip-strip` | **None of these exist here.** Branching is CSS-only (`md:`), SSR-safe by construction. The *patterns* still apply; the named modules do not exist to import |
> | § 6 | `globals.css` floors `button` to 40px on mobile, so "you usually need no per-component work" | **No global floor exists.** The floor is **44px** (`DESIGN_SYSTEM.md` § 0.8 / § 9), written per component as `min-h-[44px] md:min-h-0` |
> | § 8, § 9 | `npm run lint:mobile` ratchet; coverage tables reading zero | **No gate exists.** Those tables are theAPlink's numbers. Coverage here is **unmeasured** |
>
> **§ 6 is the one that bites.** Trusting it ships under-sized controls, and nothing in this
> repo would notice. Rationale and costs: `.claudet/DECISIONS.md`. The seat that owns this
> surface: `.claudet/AGENTS/MOBILE.md`.
>
> **If you are diffing this file against theAPlink's, these are the expected differences.**
> Do not "restore" it, and do not add a further divergence without recording it here *and* in
> `design/README.md`'s table.


> **savoycapital: mobile-first; desktop is not frozen.** (theAPlink: "Desktop is frozen.")
> Everything here describes the *mobile* surface. It coexists with
> the desktop design — it never replaces or re-themes it. Read this **and**
> `AP_DESIGN_REFERENCE.md` before any mobile work. Every desktop hard rule (the `C`
> palette, no raw hex, lucide-only icons, inline styles, `tabular-nums`, forced-light)
> applies on mobile too; this file only adds the mobile layer on top.

Most AP work happens on a desktop. Mobile is for **quick checks, approvals, and lookups** —
optimized for easy tapping, no horizontal scrolling, and tap-to-open. It is not for dense
data entry, and it does not need to be.

> **savoycapital: that premise holds for the portal and inverts for the public site.** The
> investor portal is desktop-leaning in the same way — Rodney and Jett read positions at a
> desk. The **public landing page is phone-primary**: an LP opens it from a text or an email,
> on a handset, often as their first contact with the fund. Treat a defect there as a defect
> on the primary surface, not a secondary one. `design/README.md` also warns that this folder
> supplies **no marketing patterns at all** — that surface is authored, not copied.

**The one rule that keeps mobile healthy:** a screen owes its mobile view *in the same PR
that adds it*. `npm run lint:mobile` enforces this (§8). Mobile used to be reworked every
20–40 PRs because the cost of skipping it was deferred and pooled; the gate makes it
immediate and small.

---

## 1. The breakpoint — one number, three mechanisms

**Mobile = viewport ≤ 767px. Desktop = ≥ 768px.** There is exactly one breakpoint. The
lint rejects any other (`sm:`, `lg:`, `min-width`), because a second boundary reaches
across the 767/768 line into the frozen surface.

> **savoycapital: 767/768 is the primary line, but it is not the only one allowed.** There is
> no lint to reject a second breakpoint, `DESIGN_SYSTEM.md` § 3.x uses `sm:` / `lg:`
> throughout, and this repo already ships one: `FundAllocation.tsx` floats its terms panel
> from `min-[1440px]:`, a number **derived** rather than chosen (240 sidebar + 64 shell
> padding + 720 card + 66 connector + 320 panel = 1410, so it floats at 1440). The condition
> is that a second breakpoint must be **derived from arithmetic and shown at the call site**,
> and must not reach below 768px. A breakpoint picked because it looked about right is still
> wrong. theAPlink's rationale — protecting a frozen surface — does not apply to a surface
> that is still being authored.

| Need | Mechanism | Why it's desktop-safe |
|---|---|---|
| Show/hide layout chrome | Tailwind `md:` | CSS-only, no hydration flash |
| Different content *shape* | `useIsMobile()` | SSR-safe: `false` on server + first render, so the desktop tree is byte-identical |
| Touch-target floors | `@media (max-width: 767px)` in `globals.css` | Excludes desktop by construction |

> **savoycapital: only the first mechanism exists.** There is no `useIsMobile()` (`src/lib/`
> is empty) and **no `@media (max-width: 767px)` block in `src/app/globals.css`** — so rows
> two and three of that table describe nothing. All mobile branching today is Tailwind
> `md:`, which is CSS-only and therefore SSR-safe with no hydration flash — the property
> `useIsMobile()` was built to recover. Reach for the hook when a screen needs a genuinely
> different *content shape* (not just different styling); until then, not having it is a
> feature, because CSS cannot desynchronize from the server render.

- `useIsMobile()` lives in `src/lib/use-is-mobile.ts`. Because it defaults to `false`,
  anything behind it is *only ever* read on a phone. **That is the desktop-safety guarantee.**
- The `767` constant appears in `use-is-mobile.ts`, `globals.css`, and Tailwind's `md`.
  Keep them in sync.
- **Never gate desktop styling behind `isMobile`.** The shape is always
  `isMobile ? mobileStyle : <the exact existing desktop style>` — the desktop branch should
  be untouched in the diff. **A mobile PR that changes a line outside an
  `isMobile` / `md:` / `max-width:767px` branch is the thing to question in review.**

---

## 2. Shell & navigation

Desktop keeps its left sidebar (`portal.tsx`, `hidden md:flex`). Mobile gets, all JS-gated
behind `useIsMobile` so they never enter the desktop DOM:

> **savoycapital: the shape is the same, the file and the mechanism differ, and there is no
> bottom tab bar.** `src/components/PortalShell.tsx` keeps the desktop sidebar at
> `hidden md:flex md:flex-col`, and gives mobile a sticky top bar (`md:hidden`) with a 44px
> hamburger plus a slide-in drawer over a `C.overlay` scrim with `C.shadowDrawer` — the same
> `NavBody` as the sidebar, one source of truth, closing on any navigation. It is gated by
> `md:hidden` rather than `useIsMobile`, so the chrome is in the DOM at both widths and CSS
> hides it; that costs nothing here and buys SSR safety for free.
>
> **No bottom tab bar exists, and the portal does not need one yet** — it is a three-route
> surface and the drawer is the complete nav. If a fourth or fifth route lands and one
> becomes a daily driver, a tab bar is the pattern to reach for; add the `84px` bottom
> padding to `<main>` in the same change or content will hide behind it.

- **Sticky top bar** — hamburger (opens the drawer) + screen title.
- **Slide-in drawer** — the *same* nav body as the desktop sidebar (shared `sidebarBody`,
  one source of truth), over a `C.overlay` scrim, with `C.shadowDrawer` on the panel.
  Any navigation closes it.
- **Bottom tab bar** — the feature-gated daily drivers (AP Flow, Cards, Vendors, Aging) plus
  a **Menu** tab. Tabs are ≥56px tall, icon over label, with the same red count badges as
  the sidebar. `<main>` carries `84px` bottom padding on mobile so content clears the bar.

When you add a screen that should be one tap away on mobile, add it to `bottomTabs` in
`portal.tsx` (feature-gated). Otherwise it lives in the drawer — which is fine; the drawer
is the complete nav.

---

## 3. Tables — the decision tree

Wide tables are the **only** systemic mobile problem in this app (§9). But two very
different things hide under "wide table", and conflating them overstates the work by 3×:

| | what you see | severity |
|---|---|---|
| **No scroll wrapper** | the whole **page** tears sideways | **real breakage — fix first** |
| **Wrapped, no pinned label** | the table scrolls inside its card, but the row's identity column scrolls away with it | an **improvement**, not a bug |

**Scrolling ≠ broken.** A table in an `overflow-x: auto` wrapper is functional; pinning its
first column makes it *good*. The lint reports these as separate rules (`table-overflow`
vs `table-label`) for exactly this reason. Every table needs one of these answers:

```
Does the table have an overflow-x wrapper?
└─ No → add one NOW. That alone stops the page tearing. Then continue:

Is the table the PRIMARY thing on the screen?
├─ Yes → Is a row mostly "identify it, then open it"?
│         ├─ Yes → 3a. MobileCard / MobileCardList          ← preferred
│         └─ No  → 3b. Pinned first column
└─ No  → Is it inside an already-full-screen mobile sheet?
          ├─ Yes → `// mobile-ok: renders inside a full-screen sheet`
          └─ No  → 3b. Pinned first column (or leave it scrolling and say so)
```

### 3a. Card-per-row — preferred for list screens
`MobileCard` / `MobileCardList` from `src/components/accounting/mobile-cards.tsx`. Render
the table **only on desktop** and the card list **only on mobile**:

> **savoycapital: the decision tree above is the keeper; the primitives do not exist.** There
> is no `mobile-cards.tsx`, and — as of 2026-08-24 — **no `<table>` anywhere in `src/`**, so
> nothing has needed one. The tree is still how to decide when the portfolio monitor grows
> its first table. Build `MobileCard` / `MobileCardList` in `src/components/` at that point
> rather than hand-rolling a card list per screen, and copy the API here rather than
> inventing one.

```tsx
{isMobile ? (
  <MobileCardList>
    {rows.map((r) => (
      <MobileCard
        key={r.id}
        onClick={() => openDetail(r.id)}   // the whole card is the tap target
        leading={selectable ? <input type="checkbox" … /> : undefined}
        title={r.vendorName}
        subtitle={r.email}
        right={<StatusPill … />}            // headline amount or status
        fields={[
          { label: "Total", value: money(r.total), num: true },   // num → tabular-nums
          { label: "Due", value: fmtDate(r.due) },
        ]}
      />
    ))}
  </MobileCardList>
) : (
  <div style={{ overflowX: "auto" }}><table …>…</table></div>  // unchanged desktop
)}
```

Pick **3–5 fields**, not every column. Mobile is triage: enough to decide whether to open
the row. Applied to AP Home, Vendors, Card Coding, the AP Aging bills list, and the
Reclassify transactions table.

### 3b. Pinned first column — for action-dense / matrix tables
When a table has many inline actions (select, pay, code) or is a vendor×period matrix, keep
the table but pin its label column so it stays put while the rest scrolls:

```tsx
const isMobile = useIsMobile();
const stick = (bg: string): React.CSSProperties =>
  isMobile ? { position: "sticky", left: 0, zIndex: 1, background: bg } : {};
// then on the first <th>/<td>: style={{ ...base, ...stick(rowBg) }}
```

The sticky cell **must** carry an opaque `background` matching its row, or cells scroll
visibly underneath it. Used by Card Coding's audit table, Financials (P&L / Balance Sheet —
where the mobile account column also drops its desktop tree indentation), Cash Forecast,
Labor Accrual history, and all nine Operations Sheet verification tables (shared
`stickyFirst(isMobile, bg)` helper).

---

## 4. Detail views — full-screen sheets

A detail that renders inline (AP Home) or as a centered modal (Vendors) becomes a
**full-screen sheet** on mobile, so tapping a card feels like opening a page:

> **savoycapital: the rule holds; `sheetBackdrop` / `sheetCard` do not exist to spread.**
> Build them alongside the card primitives when the first mobile sheet is needed, in
> `src/components/`, with these names and this API. Until then the pattern is written by
> hand — and the part to get right is the one this section names: drop fixed *heights* and
> side gaps, keep widths `min(Npx, 100%)`. The one detail-on-a-line pattern this repo does
> ship — `FundAllocation`'s terms panel — already stacks inline below its row under 1440px
> rather than floating, which is the same instinct applied to a desktop breakpoint.

- **Inline → sheet.** Wrap in `position:fixed; inset:0; background:C.bg; overflowY:auto`
  **only when `isMobile`**, with a sticky **Back** bar at top. Desktop stays inline.
- **Centered modal → edge-to-edge.** Don't hand-roll it — spread the shared constants from
  `mobile-cards.tsx` onto the existing backdrop/card:

  ```tsx
  // full-height, flex-scroll modal
  <div style={{ ...existingBackdrop, ...(isMobile ? sheetBackdrop : null) }}>
    <div style={{ ...existingCard, ...(isMobile ? sheetCard : null) }}>
  // short / top-aligned modal
  ...(isMobile ? sheetBackdropTop : null)   ...(isMobile ? sheetCardTop : null)
  ```

  `sheetBackdrop`/`sheetCard` for full-height, `sheetBackdropTop`/`sheetCardTop` for short
  ones. Desktop keeps its `maxWidth`/centered card because the spread is `isMobile`-gated.

Modal widths are already `min(Npx, 100%)`-responsive everywhere — **keep it that way**; the
lint gates hard-width modal cards at zero. The mobile work is removing fixed *heights* and
side gaps so short screens don't clip.

---

## 5. Chip / tab rows → one horizontal strip

A row of filter chips or tabs must never wrap to many lines or run off-screen. On mobile
only: `flex` + `flexWrap:"nowrap"` + `overflowX:"auto"` + `WebkitOverflowScrolling:"touch"`
+ `scrollbarWidth:"none"`, plus the `ap-chip-strip` class (**savoycapital: this class does
not exist — `globals.css` has no `@media (max-width:767px)` block at all; add the class and
the block together in the change that first needs a chip strip**, and note
`DESIGN_SYSTEM.md` § 3.8's universal rule that a scrolling chip row reserves ≥12px of bottom
padding so the native scrollbar does not sit on the chips) (its
`::-webkit-scrollbar{display:none}` rule lives in the `@media (max-width:767px)` block), and
`flexShrink:0` + `whiteSpace:"nowrap"` on each chip. For a full-bleed feel add
`marginLeft/Right:-14` + `paddingLeft/Right:14` to match the mobile `<main>` padding.
Desktop keeps its `flex-wrap`. Applied to the AP Flow filter chips and the AP Aging tab row.

## 5b. Fixed side panels → stacked

A two-column section with a hard-width side panel (`flex-row` + `width: 340`) forces the
whole section wider than the viewport. On mobile switch the container to
`flexDirection:"column"`, drop the panel to full width underneath, and swap the vertical
rule for a horizontal one:

```tsx
<div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16 }}>
  <div style={{ flex: "1 1 0", minWidth: 0 }}>{/* main column */}</div>
  <div style={isMobile ? { height: 1, background: C.border } : { width: 1, background: C.border, alignSelf: "stretch" }} />
  <div style={isMobile ? { minWidth: 0 } : { flexShrink: 0, width: 340 }}>{/* side panel */}</div>
</div>
```

---

## 6. Sizing, spacing, touch

`globals.css` floors tap sizes inside `@media (max-width: 767px)`, so you usually need no
per-component work:

| Element | Floor |
|---|---|
| `button`, `[role="button"]` | `min-height: 40px` |
| `input` (non-checkbox/radio), `select`, `textarea` | `min-height: 42px` |
| `input[type=checkbox|radio]` | `20 × 20px` |

> ### ⚠️ savoycapital: none of that is true here. Read this before sizing any control.
>
> **`src/app/globals.css` has no `@media (max-width: 767px)` block.** Nothing is
> auto-floored. The sentence above — "you usually need no per-component work" — is the most
> dangerous line in this file for this repo: believed, it ships under-sized controls, and no
> lint, type-check or build here will say a word.
>
> **The floor is 44px, not 40.** `DESIGN_SYSTEM.md` § 0.8 and § 9 put ≥44×44px on "every
> interactive element a thumb hits"; 40px is theAPlink's own softening of that and it did
> not carry. Write it at the call site:
>
> ```tsx
> className="… min-h-[44px] md:min-h-0"   // 44 on touch, the design's own density from md up
> ```
>
> `md:min-h-0` releases the floor above 767px because a pointer is not a thumb — so the touch
> height is *the rule* and the desktop height is a design choice. That reading is the one
> `1d8f01b` established for the fund-allocation bucket rows.
>
> **The one carve-out, and its limits.** A *spaced secondary* control may sit at 36×36px —
> secondary, ≥8px clear of its neighbours, and not repeated in a dense list (owner,
> 2026-08-23; `DESIGN_SYSTEM.md` § 0.8 / § 9). It was written for the carousel arrows. It
> **excludes** primary actions, form controls and list rows. Three stacked rows are list
> rows, so they go to 44 — that is exactly the call `1d8f01b` made.
>
> **Verify by measuring, not by reading the class.** `min-h-[44px]` on a flex child fighting
> an explicit `height` renders at neither. The standard to hold is the measured claim in
> `1d8f01b`: *"44px at 390px wide, 38.5px at 1000px, measured in a browser on the production
> build rather than inferred from the class."*

- Components size controls with **padding**, not `height`, so these floors apply on mobile
  without touching desktop. `min-height` beats `height`, so an inline `height: 22` on a
  `<button>` still renders 40px tall on a phone — **but only on a `<button>`/`[role=button]`/`<a>`.**
  A clickable `<div>`/`<span>` is not floored; give it padding or a ≥40px height. The lint
  checks exactly this. **savoycapital: no floor and no lint — every element carries its own
  `min-h-[44px]`, `<button>` and `<div>` alike, and nothing checks that you did.**
- **No hard pixel width above ~347px** (375px phone − 14px shell padding each side). Use
  `min(Npx, 100%)`, a flex basis, or `maxWidth`. Gated at zero.
- Mobile `<main>` padding is `14px`; bottom padding `84px` to clear the tab bar.
  **savoycapital: there is no bottom tab bar** (see § 2), so no bottom clearance is owed.
  Shell padding is the page's own — `px-5 md:px-10` on the public surface.

---

## 7. Money, icons, colour

Unchanged from desktop, and worth restating because they're the easiest thing to drop when
rewriting a row as a card: money stays **integer cents** formatted at render with
`tabular-nums` (`num: true` on a `MobileCard` field does this); colours come from `C`; icons
are lucide only.

---

## 8. Enforcement — `npm run lint:mobile`

> ### ⚠️ savoycapital: this gate does not exist. Everything in § 8 is a blueprint, not a state.
>
> There is no `scripts/mobile-lint.mjs`, no baseline, no ratchet — `scripts/` is empty.
> `npm run verify` is **typecheck + lint**; CI adds `npm run build`. So the rule this file
> opens with — *a screen owes its mobile view in the same PR that adds it* — is real and
> binding, but it is **held by hand**, and `.claudet/README.md` rule 3 forbids describing it
> as enforced.
>
> That makes the discipline matter *more*, not less. theAPlink pooled the cost of skipping
> mobile and paid it back every 20–40 PRs; the gate is what made it immediate. Here it is
> immediate only because someone chooses it each time — and that choice is cheap now and
> expensive later, which is the whole argument for making it now.
>
> **Build the gate when the surface earns it** — the honest trigger is the first `<table>`,
> or the point where UI files outrun one reviewer's attention. Build it to this spec: it is
> the output of an audit that measured 74 components, and the split it encodes
> (`table-overflow` = breakage vs `table-label` = improvement) is the finding, not a
> preference. Two things to carry over on day one: the ratchet must be **tested like product
> code** (a gate with a broken regex reads green forever), and a waiver must be a design
> decision with a stated reason, never a way around the linter.

A ratchet, same semantics as the design and tenant-scoping gates: the baseline only shrinks,
new violations fail, and a deliberate exception takes `// mobile-ok: <reason>` on the line
above (reason required). `node scripts/mobile-lint.mjs --report` prints the coverage
profile; `--update` rewrites the baseline after you improve it. Its own behaviour is
regression-tested in `scripts/mobile-lint.test.ts`.

| rule | what it catches | severity | today |
|---|---|---|---|
| `table-overflow` | a `<table>` with no mobile branch **and no scroll wrapper** — the page tears | **breakage** | **0 — clean** |
| `table-label` | a wrapped table whose label column scrolls away | improvement | **0 — clean** |
| `tap-target` | sub-40px height on a clickable *non-button* | minor | **0 — clean** |
| `column-count` | a multi-column list with no `max-width:767px` override | breakage | **0 — gates at zero** |
| `fixed-width` | a hard width ≥300px not gated behind `isMobile` (the side-panel case) | breakage | **0 — gates at zero** |
| `modal-width` | a modal card without `min(Npx, 100%)` | breakage | **0 — gates at zero** |

**What it cannot check.** The gate covers roughly half the audit rubric in
`design/MOBILE_AUDIT_PLAYBOOK.md` §3. It sees nothing of:
- **Clipped controls** — a `flexShrink: 0` row inside `justify-between` / `overflow:hidden`.
  Clipping is *worse* than scrolling: the control is unreachable, not just off-screen.
- A flex child missing `minWidth: 0`, so it refuses to shrink.
- Stat cards / grids staying N-up and cramped instead of stacking.
- Chip or sub-tab rows wrapping to many lines.
- Long unbroken strings (filenames, account names) with no `overflowWrap`.
- A modal that *fits* but isn't a sheet; tree indentation eating a sticky label.
- Whether the 3–5 fields you chose for a card are the **right** ones, whether a sticky
  column actually reads well, whether the flow works end-to-end on a phone, and real-device
  behaviour (keyboard overlap, safe-area insets, momentum scrolling).

That list is the sweep's job. The gate exists so the sweep never again has to re-fix the
mechanical half.

**Hooks-order gotcha:** put `const isMobile = useIsMobile()` **before any early `return`**
in the component, or eslint's rules-of-hooks fails.

---

## 9. Where mobile actually stands

> ### ⚠️ savoycapital: every number below is theAPlink's. Ours is *unmeasured*.
>
> Not "zero" — **unmeasured**. There is no gate to produce a count, and no audit has been run
> against this repo's screens. Quoting "100% coverage" or "baseline `{}`" here would report
> another product's health as this one's, which is the precise failure `.claudet/README.md`
> rule 1 exists to prevent. Until a sweep or a gate produces a number, the honest sentence is
> *"mobile has not been measured."*
>
> What is known without a gate, as of 2026-08-24: **no `<table>` exists in `src/`**, so the
> entire table backlog this section is about is empty by construction; the portal shell has a
> working drawer; and `FundAllocation` and `PortalShell` carry deliberate 44px floors. That
> is a starting position, not a clean bill of health.
>
> **Read the rest of § 9 as the case study it is.** Its lesson is the durable part: the
> problem was concentrated in one pattern nobody was required to adapt, which made it a
> *process* gap, not a design one — and a periodic sweep never fixed it for long. That is the
> argument for adapting each screen as it ships, which costs nothing while an app is this
> small.

**Every mobile-lint rule is at zero.** `scripts/mobile-lint-baseline.json` is `{}` — there
is no accumulated debt for a new violation to hide inside, and the next one of any kind
fails the build in the PR that introduces it.

| | at the audit (2026-08-10) | now |
|---|---:|---:|
| Tables with a mobile branch | 53 of 140 (38%) | **140 of 140 (100%)** |
| `table-overflow` — the page tears | 22 | **0** |
| `table-label` — label scrolls away | 65 | **0** |
| `tap-target`, `column-count`, `fixed-width`, `modal-width` | 5 / 0 / 0 / 0 | **0** |

### What the audit found, and why it mattered
Measured across 74 accounting components, the problem was unusually concentrated. Modals
were healthy (39 responsive `min(Npx,100%)` widths, zero hard-width cards); layout widths
were healthy (zero overflowing a 375px phone); tap targets were near-healthy (38 of 43
sub-40px heights sat on `<button>`, auto-floored by `globals.css`); breakpoint discipline
was already enforced by design-lint.

**Tables were the entire problem** — every feature added one, nothing required a mobile
branch, and 87 accumulated. That is a process gap, not a design one, which is exactly why a
periodic sweep never fixed it for long. The remedy is §8, not a bigger sweep.

### Keeping it at zero
The gate blocks regressions, so the resting state is clean rather than slowly rotting. Two
things to hold onto:

- **A waiver must be a design decision, never a way around the linter.** Five `mobile-ok`
  waivers once existed purely because `tap-target` looked back a fixed 6 lines and so read
  a real `<button>` as an unfloored `<div>`. The rule now resolves the enclosing element
  properly and those waivers are gone. If you find yourself writing "the lint can't see
  X" — fix the lint.
- **The gate covers about half the rubric.** It is blind to clipped controls, a flex child
  missing `minWidth: 0`, cards staying N-up, chip-row overflow, long unbroken strings, a
  modal that fits but isn't a sheet, and tree indentation eating a sticky label. A green
  build means mobile is not getting *worse* — not that it is *done*. Those still need a
  person on a phone; see `design/MOBILE_AUDIT_PLAYBOOK.md` §3.

---

## 10. Checklist for any mobile change

1. Branch with the right mechanism (§1). Never gate desktop behind `isMobile`.
2. No horizontal scroll for a primary view — cards (§3a) or a pinned column (§3b).
3. Tap-to-open: the card/row opens a detail; details are full-screen sheets (§4).
4. Money stays cents + `tabular-nums`; colours from `C`; icons lucide — same as desktop.
5. `npm run verify` green, and check the diff: **every changed line should sit inside an
   `isMobile` / `md:` / `max-width:767px` branch.** If one doesn't, that's the bug.
   **savoycapital: this step is the retrofit posture and does not apply** — desktop is not
   frozen here, so a change outside a mobile branch is ordinary work, not a defect. What
   still applies is the intent: know which surface each changed line affects, and say so.
   `npm run verify` is typecheck + lint only; CI adds `npm run build`.
6. Look at it at 375px wide. Desktop must be **identical** at ≥768px.
