# theAPlink — Mobile Spec (source of truth for ≤767px)

> **Desktop is frozen.** Everything here describes the *mobile* surface. It coexists with
> the desktop design — it never replaces or re-themes it. Read this **and**
> `AP_DESIGN_REFERENCE.md` before any mobile work. Every desktop hard rule (the `C`
> palette, no raw hex, lucide-only icons, inline styles, `tabular-nums`, forced-light)
> applies on mobile too; this file only adds the mobile layer on top.

Most AP work happens on a desktop. Mobile is for **quick checks, approvals, and lookups** —
optimized for easy tapping, no horizontal scrolling, and tap-to-open. It is not for dense
data entry, and it does not need to be.

**The one rule that keeps mobile healthy:** a screen owes its mobile view *in the same PR
that adds it*. `npm run lint:mobile` enforces this (§8). Mobile used to be reworked every
20–40 PRs because the cost of skipping it was deferred and pooled; the gate makes it
immediate and small.

---

## 1. The breakpoint — one number, three mechanisms

**Mobile = viewport ≤ 767px. Desktop = ≥ 768px.** There is exactly one breakpoint. The
lint rejects any other (`sm:`, `lg:`, `min-width`), because a second boundary reaches
across the 767/768 line into the frozen surface.

| Need | Mechanism | Why it's desktop-safe |
|---|---|---|
| Show/hide layout chrome | Tailwind `md:` | CSS-only, no hydration flash |
| Different content *shape* | `useIsMobile()` | SSR-safe: `false` on server + first render, so the desktop tree is byte-identical |
| Touch-target floors | `@media (max-width: 767px)` in `globals.css` | Excludes desktop by construction |

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
+ `scrollbarWidth:"none"`, plus the `ap-chip-strip` class (its
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

- Components size controls with **padding**, not `height`, so these floors apply on mobile
  without touching desktop. `min-height` beats `height`, so an inline `height: 22` on a
  `<button>` still renders 40px tall on a phone — **but only on a `<button>`/`[role=button]`/`<a>`.**
  A clickable `<div>`/`<span>` is not floored; give it padding or a ≥40px height. The lint
  checks exactly this.
- **No hard pixel width above ~347px** (375px phone − 14px shell padding each side). Use
  `min(Npx, 100%)`, a flex basis, or `maxWidth`. Gated at zero.
- Mobile `<main>` padding is `14px`; bottom padding `84px` to clear the tab bar.

---

## 7. Money, icons, colour

Unchanged from desktop, and worth restating because they're the easiest thing to drop when
rewriting a row as a card: money stays **integer cents** formatted at render with
`tabular-nums` (`num: true` on a `MobileCard` field does this); colours come from `C`; icons
are lucide only.

---

## 8. Enforcement — `npm run lint:mobile`

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
6. Look at it at 375px wide. Desktop must be **identical** at ≥768px.
