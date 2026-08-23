# HTeaO App — Design System

**Status:** Live source of truth (promoted 2026-05-29). This is the authoritative reference for all UI agents — every component, form, table, badge, button, and layout element must follow these rules exactly. `.claude/rules/ui-governance.md` and `CLAUDE.md` both point here.

> ### ⚠️ savoycapital divergence — this file is no longer identical to theAPlink's
>
> Every other file in `design/` is byte-for-byte theAPlink's. **This one is not, as of
> 2026-08-23.** One rule has been amended for this product, by the owner:
>
> | § | theAPlink | savoycapital |
> |---|---|---|
> | 0.8 | No animations over 200ms | Same, **except a content crossfade may run to 400ms** |
>
> The carve-out is narrow on purpose: it covers one block of content replacing another
> (the portfolio carousel), not UI feedback, which still has a hard 200ms ceiling.
> Rationale and the standing rule for future divergences: `.claudet/DECISIONS.md`.
>
> **If you are diffing this file against theAPlink's, that is the expected difference.**
> Do not "restore" it, and do not add further divergences without recording them here.


The kitchen-sink page at `/admin/design-system` is **built** (`src/app/(dashboard)/admin/design-system/page.tsx`, shipped `b8587e7`) and renders the primitives in §3 — a primitive that isn't on the page isn't a primitive.

---

## Section 0 — Principles

1. **Mobile-first, always.** Every component is designed at 375px first. Desktop is the expanded view, not the default. If it doesn't work one-thumbed at the counter, it doesn't ship.
2. **One primary action per screen.** Accent color (`var(--th-accent)`, sky blue) is reserved for the screen's primary action and active-state indicators. If two things are "primary," one of them isn't.
3. **Color = meaning, never decoration.** Green = positive/success. Red = negative/error/destructive. Amber = caution/needs-action (maintenance, alerts) — never for financial variance. Accent = primary action / active state. Purple = identity badges. Never use color for emphasis or to "make it pop."
4. **Tokens, not literals.** Every color, background, border, shadow goes through a `var(--*)` token. `#hex` and `rgba(...)` literals are banned in `style` props except for SVG fills and the theme-neutral backdrop scrim. Tokens swap with light/dark; literals don't.
5. **Negative space is the layout.** Chrome (borders, shadows, dividers) supports content, never decorates it. If you're considering an extra border to "separate things," start by adding 4px of space instead.
6. **One canonical state per role.** One loading pattern. One empty pattern. One error pattern. One save bar. One modal. One sheet. Inventing a new state for a new screen is a system failure.
7. **Truncate, don't wrap — except for values that must be read in full.** Lists, cards, table cells use `whiteSpace: "nowrap"; overflow: "hidden"; textOverflow: "ellipsis"` for **labels and names**. Money amounts, counts, account last-4s, and dates are never truncated — they must always render fully or break to a new line. Multiline copy lives inside card body copy only.
8. **Performance is part of UX.** Tap targets ≥44×44px on every interactive element a thumb hits. No animations over 200ms — **except a content crossfade**, one block of content replacing another in place, which may run to **400ms**: at 200ms two full paragraphs swapping reads as a flicker rather than a transition. UI feedback — hover, press, open, close — stays under 200ms, no exception. No font load that blocks first paint. No layout shift after the first frame. These aren't engineering concerns — they're UX.

---

## Section 1 — UI Ownership & Process

**Jett is the UI owner.** Before modifying ANY file in UI scope — even if the user requested the task — flag it first:

> "Heads up — this task will modify UI files: [list files]. These changes affect [colors/layout/styling/components]. Proceed?"

**UI scope** (requires confirmation): `src/app/**/page.tsx`, `src/components/**/*`, `src/app/globals.css`.

**Non-UI scope** (modify freely): `src/app/api/**`, `src/lib/**`, `prisma/**`, `src/hooks/**`, scripts, docs.

### Migration policy

- Existing shadcn components in `src/components/ui/` remain until explicitly rethemed (grandfathered).
- All new and modified UI uses inline styles per this doc.
- No new shadcn component imports.

### Design-before-code

For any new screen or non-trivial component: write the spec (layout, states, copy, interactions) in chat, get Jett's OK, then implement. Skip this only for clear bug fixes and copy edits.

### Sweep discipline (every page in scope, every time)

When a section is in scope for a Phase 3.x sweep (per Decision 21 Rule 5 ordering), **every page in the section gets canon treatment in the same PR.** No "ship the easy parts and come back later." No silent triage that leaves half the section on the legacy header. If scope must be cut for a real reason (e.g. a sub-route is a documented exception, or a page genuinely belongs to a different phase), lead with that in the user-facing recap — not in the commit message body where it gets missed.

**Coverage grep before any "done" claim.** Before declaring a section sweep complete, run the grep that counts pages still missing the primitive (or whatever the sweep's headline change is) and post the count. Either the count is zero or the recap names what's left and why. Example:

```bash
for f in $(find "src/app/(dashboard)/<section>" -name "page.tsx"); do
  grep -q "from \"@/components/primitives\"" "$f" || echo "MISSING $f"
done
```

**Commit message and user-facing recap must match.** If you cut scope, the recap leads with that — not "section at 0 violations." A technically-true lint count over an honest scope disclosure is the pattern that erodes trust.

**Fresh `Read docs/DESIGN_SYSTEM.md` at the start of every phase.** The ui-governance.md rule auto-loads when touching UI files but agents have been operating from cached canon knowledge across phases. Read the canon sections in scope at the top of each phase — at minimum §2 token families, §3.1 PageHeader, §3.6 inputs, §3.8 store-picker chip, §3.9 table, §5 glyph rules. Cite the actual file:line in the phase's CITATION CHECK, not memory.

Designated 2026-05-29 (Decision 28) after Phase 3.8 shipped 14 product-tracking pages still using the legacy header.

### Documented section exceptions

The canon is universal except for the explicitly documented exceptions below. Each exception is scoped to a path prefix and carries a stated reason + a graduation trigger that ends the exception.

- **`src/app/(dashboard)/schedule-builder/**`** — 7Shifts-mirror UI prototype, **light-mode only**. The section is a front-end mockup of the 7Shifts Time Clocking / Roster / Settings screens, intentionally pinned to a forced light palette (per-page `const C = { bg, border, text, ...hex... }`) so reviewers can compare side-by-side with 7Shifts in the same browser window. Backend is not wired (per inline `alert("... backend not wired")` placeholders). The section opts out of `var(--*)` tokenization, `<PageHeader>` adoption, and dark-mode support **until** the backend graduates from mockup. Graduation trigger: when the first sub-route persists real GM data, re-evaluate this exception in a fresh decision. Lint script skips the path (`scripts/check-design-tokens.ts:SKIP_PATTERNS`). Designated 2026-05-29 (Decision 26).
- **`src/app/accounting/**` + `src/components/accounting/**`** — standalone QuickBooks accounting portal, **light-mode only** (Jett, 2026-07-06). The portal is a Scheduler-style surface (left nav pane + main area) intentionally pinned to a forced light palette (per-page `const C = { bg, border, text, ...hex... }`, mirroring `schedule-builder`) so it matches the Scheduler shell the accounting team works in. It lives outside `(dashboard)` (no app chrome) and the root layout pins `<html class="dark">`, so it uses its own light backdrop + palette rather than the dark theme tokens. Opts out of `var(--*)` tokenization + dark-mode. Graduation trigger: if the app later supports a real per-viewer light/dark toggle for standalone sections, re-evaluate. Lint script skips both paths (`scripts/check-design-tokens.ts:SKIP_PATTERNS`). Designated 2026-07-06.
- **`src/app/sign-in/**` + `src/app/sign-up/**`** — Clerk-hosted auth pages, **light-mode only by design** (Jett, 2026-05-29). They render Clerk's `<SignIn>`/`<SignUp>` driven by the `appearance` API (which needs concrete color values, not `var(--*)`) and define their own light CSS-var overrides to pin the login surface light regardless of app theme. Tokenizing them would break Clerk theming and the intended light-lock. Opts out of tokenization + dark-mode. Note: the separate custom `src/app/(auth)/login/page.tsx` is NOT in this exception (it was tokenized; brand navy/gold arbitraries aside). Lint script skips both paths (`scripts/check-design-tokens.ts:SKIP_PATTERNS`). Designated 2026-05-29 (Decision 30).

---

## Section 2 — Tokens

All design tokens are CSS custom properties defined in `src/app/globals.css`. **Use the token name, never the resolved value.** Tokens swap automatically with light/dark theme — `:root` holds the light-mode defaults, the `.dark` class on `<html>` overrides for dark mode. The value source is `globals.css` and only `globals.css` — this doc never repeats a resolved hex.

### Surface

```
var(--card)              opaque card surface, theme-swaps (modal/sheet body)
var(--card-foreground)   default text on --card
var(--surface-card)      transparent card layer over the page bg (inline cards)
var(--surface-subtle)    quieter card layer (nested cards)
var(--surface-input)     input/dropdown background
var(--surface-raised)    button/chip background (inactive)
```

### Border

```
var(--border-card)       default card/chip border
var(--border-input)      input border
var(--border-row)        in-table row divider
var(--border-section)    between-section divider
```

### Text

```
var(--text-primary)      headings, names, primary values
var(--text-secondary)    supporting data
var(--text-muted)        labels, descriptions, empty states
var(--text-dimmer)       column headers, metadata
```

### Accent (sky blue — primary action, active state, links)

```
var(--th-accent)
var(--accent-bg-medium)
var(--accent-bg-strong)
var(--accent-border-subtle)
var(--accent-border-bold)
```

### Success (green — positive, submit, completed)

```
var(--th-success)
var(--success-bg-medium)
var(--success-bg-strong)
var(--success-border-subtle)
var(--success-border-bold)
```

### Error (red — negative, destructive, error state)

```
var(--th-error)
var(--error-bg-medium)
var(--error-bg-strong)
var(--error-border-subtle)
var(--error-border-bold)
```

**Solid alert exception (`--th-error-solid` / `--text-on-error-solid`):** the only canon-sanctioned solid-fill red pattern is the **notification count pill** — a small numeric badge (open ticket count, unread items, "99+") that needs maximum visual weight at thumbnail size. Apply via `background: var(--th-error-solid); color: var(--text-on-error-solid)` and nothing else. Never use these tokens as a button background, panel chrome, banner, header, or any clickable surface — the Diagnose pattern (subtle tint + colored text) covers every other negative semantic. Audit map (2026-05-29): sidebar.tsx + sidebar-mobile.tsx (global nav badge), repairs-maintenance/page.tsx + repairs-maintenance/schedule/page.tsx (open-ticket count). Adding a fifth site requires a new decision in DECISIONS-DESIGN-SYSTEM.md.

### Warn (amber — caution / needs-action only)

```
var(--th-warning)
var(--warning-bg-medium)
var(--warning-bg-strong)
var(--warning-border-subtle)
var(--warning-border-bold)
```

**Scope of the warn family — strict.**

- Use for: maintenance alerts, "needs action" CTAs (e.g. the Diagnose pill), pending states that require user input, caution badges, ticket urgency markers.
- **Never for financial variance.** Positive = `var(--th-success)`, negative = `var(--th-error)`. The amber family does not appear in any money / KPI / variance display, ever. Principle 3 wins.

**Accessibility verification (WCAG 2.1):** `var(--th-warning)` foreground on the page background clears the §7 4.5:1 minimum in both themes — dark mode (`#fbbf24` amber-400 on `#080e1a`) achieves ~11.6:1, light mode (`#92400e` amber-800 on `#F5F5F0` cream) achieves ~6.4:1. The light-mode value is intentionally a step darker than the dark-mode value because cream pushes amber luminance closer to background luminance than near-black does — the same amber-500 that works on dark would have failed on cream. The previous light-mode value (`#d97706`, amber-600) measured only 2.91:1 — fixed in Phase 0 of the design-system code work.

**Structure mirrors the existing color families exactly.** Five tokens, same naming convention (full word `warning`, matching `accent` / `success` / `error`). Dimmed states (e.g. the Diagnose "Continue diagnosing" variant when there's already a thread) are handled by swapping `--warning-bg-strong` → `--warning-bg-medium`, not by introducing a separate "soft" color token. The same dimming approach applies to accent/success/error.

### Purple (identity badges — Safe count, Manual source flags)

```
var(--th-purple)
var(--purple-bg)
var(--purple-border)
```

### Pink (donations — distinct from Giveaway purple)

```
var(--th-pink)
var(--pink-bg)
var(--pink-bg-medium)
var(--pink-bg-strong)
var(--pink-border)
var(--pink-border-bold)
```

Scope: marketing-donation rows + donation totals in product-tracking. Distinct from purple (which marks giveaways) so reviewers can scan donations vs giveaways at a glance. Added 2026-05-29 in Phase 3.8 — the code expected `var(--th-pink)` for months but the tokens were never defined; rgba fallbacks were the workaround.

### Backdrop (theme-neutral)

```
rgba(0,0,0,0.55)   modal/sheet backdrop scrim — the only allowed rgba literal in component code
```

### Spacing scale

```
4, 6, 8, 10, 12, 16, 20, 24
```

Anything outside the scale requires a written exception in this doc.

### Radius scale

```
4   badges, pills, status indicators (rectangles only — no circles for badges)
6   small chips, filter chips, inline edit buttons
8   buttons, inputs, selects, date inputs
10  larger buttons, dashed/dotted "empty" cards
12  cards / panels
16  modal/sheet top corners
999 circular icon buttons (nav cluster), sheet drag-handle, decorative dots
```

### Type scale

```
fontFamily       always var(--font-sans) via inherit — Inter, loaded in layout.tsx
fontFamily mono  var(--font-geist-mono)

Page title       24px, weight 700, letter-spacing -0.025em (source: Sales Information header at src/components/weather-demand/weather-demand-dashboard.tsx:505)
Section header   14px, weight 800, uppercase, letter-spacing .04em
Eyebrow          10px, weight 700, uppercase, letter-spacing .1em, color var(--th-accent)
Body             12-13px, weight 500-600
Secondary body   11px, weight 500
Field label      9-10px, weight 700, uppercase, letter-spacing .06-.08em, color var(--text-dimmer)
Stat number      16-22px, weight 700-800, fontVariantNumeric tabular-nums
Inline badge     9-10px, weight 700-800
```

Numerics always `fontVariantNumeric: "tabular-nums"`.

---

## Section 3 — Primitives

For each: rules + canonical implementation file. The kitchen-sink page (planned at `/admin/design-system`) will render all of them.

### 3.1 Page chrome

**Outer layout (already in place — keep):** `src/app/(dashboard)/layout.tsx:30`

```jsx
<main className="dashboard-main px-4 py-6 sm:px-6 lg:px-8">
  {children}
</main>
```

- `.dashboard-main` (defined in `src/app/globals.css`) is a CSS Grid with a centered 48rem narrow column and full-width escape lanes on either side.
- Default children render in the narrow column. Children with `className="full-bleed"` escape to full width (for wide tables/charts).
- Horizontal padding: `16px` mobile / `24px sm` / `32px lg`. Vertical padding: `24px`.

**Page-root pattern (canonical — adopt everywhere):**

```jsx
<div className="flex flex-col gap-3 sm:gap-4">
  <PageHeader eyebrow="Inventory" title="Stock Counts" subtitle="…" />
  {/* content */}
</div>
```

- Responsive spacing uses Tailwind layout utilities: `gap-3 sm:gap-4` (12px mobile / 16px desktop). Inline `style` props don't honor breakpoints; never use inline `gap` for responsive spacing.
- One pattern: flex column, layout-utility gap. Stop using `space-y-3` / `space-y-4` / `space-y-6` / mixed Tailwind+inline.
- The page root **never** adds its own padding — horizontal OR vertical. `<main>`'s `px-4 sm:px-6 lg:px-8 py-6` is the single source of page-edge spacing; per-page `padding: "24px 0 48px"` etc. double-stack on top of `py-6` and make the top-nav→PageHeader gap inconsistent across pages. Pages that touch the viewport edge OR add their own page-root padding are bugs.
- The page root does not set its own `maxWidth` or `margin: "0 auto"` — that is `.dashboard-main`'s grid (centered 48rem narrow column, full-width via `.full-bleed`).
- The PageHeader sits at the top of the page root as the canonical first element. The ideal pattern wraps siblings in the page root's `gap-3 sm:gap-4` (no per-sibling `marginBottom`); the transitional pattern keeps existing `marginBottom`-on-children rhythm. Either is acceptable so long as the page root itself has no padding — that's the rule that prevents top-nav→PageHeader drift across pages.

**Page header row (canonical):**

```jsx
function PageHeader({ eyebrow, title, subtitle, action, hideSubtitleOnMobile }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em",
            color: "var(--th-accent)", margin: 0,
          }}>{eyebrow}</p>
        )}
        <h1 style={{
          fontSize: 24, fontWeight: 700,
          color: "var(--text-primary)", margin: "2px 0 0", letterSpacing: "-0.025em",
          lineHeight: 1.2,
        }}>{title}</h1>
        {subtitle && (
          <p className={hideSubtitleOnMobile ? "hidden sm:block" : undefined} style={{
            fontSize: 14, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.4,
          }}>{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
```

- **Sizing source of truth:** the `<PageHeader>` primitive itself (`src/components/primitives/page-header.tsx`). Title 24px / weight 700 / -0.025em letter-spacing, subtitle 14px. The primitive was originally modeled on the Sales Information h1 (`weather-demand-dashboard.tsx:505-508`, Tailwind: `text-2xl font-bold tracking-tight`); Sales adopted the primitive 2026-05-29 (Phase 3.6 / Decision 27), closing the legacy canon split where the SOT itself used Tailwind theme classes. Adding new sizing requires editing the primitive, not a per-page override.
- Title is flat 24px (no clamp). Sales proves this is comfortable on both mobile and desktop at the same value, so the primitive doesn't need a responsive scale.
- Subtitle hidden on `<640px` when the consumer passes `hideSubtitleOnMobile` (avoids the long-paragraph problem).
- Action slot is for page-level CTAs (e.g. Add Target).
- **Eyebrow rule (Decision 32):** set `eyebrow` to the **parent section name on sub-pages** (`/section/sub/…`) — the global top-nav breadcrumb shows only the last route segment, so the eyebrow supplies the parent context it omits. **Omit `eyebrow` on section-root pages** (`/section/page.tsx`) — the breadcrumb already names the section, so an eyebrow there is a literal duplicate.

**Section spacing scale (canonical):**

| Use | Token / class |
|---|---|
| Page sections (between header + main blocks) | `gap-3 sm:gap-4` (12 / 16) |
| Card body internal | `padding: "12px 16px"` |
| Card body compact (dense tables) | `padding: "8px 12px"` |
| Stacked form fields | `gap: 16` inline OR `gap-4` |
| Inline form fields / chip rows | `gap-2 sm:gap-3` (8 / 12) |
| Button cluster | `gap: 8` inline OR `gap-2` |

No other values without a written exception in this doc.

### 3.2 Button — Diagnose pattern

Single canonical button shape. Variants change color family only, not geometry. **Solid-fill buttons (heavy single-color fill with white-ish text) are banned in every variant.** Use the tinted-bg / accent-text / accent-border style.

```jsx
<button style={{
  padding: "10px 16px",          // ≥44px tall on iOS Safari default font
  borderRadius: 8,
  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  cursor: "pointer",
  background: "var(--accent-bg-strong)",
  color: "var(--th-accent)",
  border: "1px solid var(--accent-border-bold)",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
}}>Action</button>
```

**Variants** (swap color family, keep geometry):

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| **Primary** (default) | `--accent-bg-strong` | `--th-accent` | `--accent-border-bold` | Default CTA (Save, Confirm, Submit-in-form) |
| **Success** | `--success-bg-strong` | `--th-success` | `--success-border-bold` | Final submit (Submit ticket, Complete count) |
| **Destructive** | `--error-bg-strong` | `--th-error` | `--error-border-bold` | Delete, Cancel-with-loss |
| **Warn** | `--warning-bg-strong` | `--th-warning` | `--warning-border-bold` | Needs-action CTAs (Diagnose, Resolve ticket) |
| **Secondary** | `--surface-raised` | `--text-secondary` | `--border-card` | Cancel, secondary toolbar action |
| **Ghost** | `transparent` | `--text-muted` | `transparent` | Toolbar buttons in dense tables, icon-only inline actions |

**Dimmed / less-emphatic state** (e.g. "Continue diagnosing" when a thread already exists): swap `*-bg-strong` → `*-bg-medium` and `*-border-bold` → `*-border-subtle`. Same color family, lower visual weight. Do not introduce dedicated "soft" color tokens.

**Disabled state:** swap background to `--surface-input`, text to `--text-dimmer`, border to `--border-card`. Do not rely on `opacity: 0.4` alone — that fails contrast checks.

> **Deliberate change from the old doc.** The previous DESIGN_SYSTEM.md said "opacity 0.4, do not change bg/border" for disabled buttons. That rule fails accessibility — `opacity: 0.4` on `var(--th-accent)` text on `var(--accent-bg-strong)` measures under 3:1 in both themes, so the disabled label literally can't be read. The token-swap pattern keeps the button readable while clearly signaling disabled. Documenting it as intentional so nobody "fixes" it back to the old opacity rule.

**Reference implementation (token-pure):** Log Drop-off button at `src/components/community-marketing/target-detail-sheet.tsx` (the primary CTA inside the Quick Drop-off card).

**Migration target (token-purge work):** previously the Diagnose pill at `src/app/(dashboard)/repairs-maintenance/tickets/page.tsx:546-559` used literal amber `#f59e0b` / `rgba(245,158,11,...)`. Converted to the warning token family in Phase 0 of the design-system code work; the file now serves as the canonical reference implementation for the Warn button variant alongside the Log Drop-off button (accent variant).

### 3.3 Circular icon button

For nav clusters (Home, Back in header). 36×36, never smaller.

```jsx
<button aria-label="Back" style={{
  width: 36, height: 36, borderRadius: 999,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "var(--accent-bg-strong)", color: "var(--th-accent)",
  border: "1px solid var(--accent-border-bold)",
  cursor: "pointer", fontFamily: "inherit",
}}><ChevronLeft size={16} /></button>
```

**Reference implementation:** Header back/home buttons at `src/components/layout/header.tsx`.

### 3.4 Modal / Bottom sheet — SuggestionModal canon

**Source of truth:** `src/components/labor/intraday-labor-dashboard.tsx:1722-1799` (`SuggestionModal`).

- Container: `var(--card)` bg + `var(--card-foreground)` text + 1px solid `var(--border-card)`, `borderRadius: "16px 16px 0 0"`, top shadow `0 -8px 24px rgba(0,0,0,0.18)`.
- Backdrop: `rgba(0,0,0,0.55)` (theme-neutral).
- Drag handle: 36×4 bar, `borderRadius: 4`, `var(--border-card)`, top-centered.
- Sizing: `maxWidth: 560`, `maxHeight: 85vh`, bottom-anchored sheet.
- Section header: lucide icon in `var(--th-accent)` + 14px 800-weight uppercase label.
- Close button top-right, `<X size={18} />`, `var(--text-muted)`, transparent background.

### 3.5 Card

```jsx
<div style={{
  background: "var(--surface-card)",
  border: "1px solid var(--border-card)",
  borderRadius: 12,
  overflow: "hidden",
}}>
  {/* optional header */}
  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-section)" }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--th-accent)" }}>Card Title</span>
  </div>
  {/* body */}
</div>
```

**Light-mode rule:** every card surface gets a visible border. The current `var(--border-card)` already swaps; the bug today is files using literal rgba that doesn't. Lint catches.

### 3.6 Inputs (text, select, date, number)

```jsx
<input
  type="text" inputMode="numeric"       // for numeric input — never type="number"
  style={{
    width: "100%", padding: "10px 12px", borderRadius: 8,
    fontSize: 13, fontWeight: 500, fontFamily: "inherit", boxSizing: "border-box",
    background: "var(--surface-input)",
    border: "1px solid var(--border-input)",
    color: "var(--text-primary)",
    outline: "none",
    // Do NOT set colorScheme inline. The native date picker's color scheme
    // follows the global theme via `input[type="date"] { color-scheme: light; }`
    // (default) and `.dark input[type="date"] { color-scheme: dark; }` (override)
    // in globals.css. Hardcoding "dark" inline breaks the native picker in light mode.
  }}
/>
```

- Padding bumped to `10px 12px` so the input is ≥44px tall on iOS.
- `colorScheme` is **not** set inline — the theme-scoped global CSS rule handles it.
- Disabled inputs swap to `var(--surface-subtle)` bg, `var(--border-card)` border, `var(--text-dimmer)` text.

**Form grid layout (two-column form, stacks on mobile):**

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ maxWidth: 600 }}>
  <Field label="First name">…</Field>
  <Field label="Last name">…</Field>
</div>
```

- Use Tailwind layout utilities — `grid-cols-1 sm:grid-cols-2 gap-4` — never inline `gridTemplateColumns: "1fr 1fr"`. Inline grid-template can't honor the `sm:` breakpoint, so it stays two-column on mobile and breaks the mobile-first rule. Same trap as inline responsive `gap`.
- `maxWidth: 600` keeps a paired-field form readable on wide desktop monitors.

### 3.7 Stepper

**Source of truth:** `src/components/product-tracking/giveaway-form.tsx:42-90` (kept inline per Jett — not extracted to shared).

110×48, plus/minus buttons + tappable center input. Active value colored `var(--th-accent)`; zero colored `var(--text-primary)`. ≥44px tall meets the tap-target rule.

### 3.8 Store-picker chip — Intraday Labor canon

**Source of truth:** `src/components/labor/intraday-labor-dashboard.tsx:834-859`.

```jsx
<button className="flex-shrink-0 whitespace-nowrap transition-all" style={{
  padding: "4px 10px", borderRadius: 8,
  fontSize: 10, fontWeight: isActive ? 800 : 600, fontFamily: "inherit",
  background: isActive ? "var(--accent-bg-strong)" : "var(--surface-card)",
  border: `1px solid ${isActive ? "var(--accent-border-bold)" : "var(--border-card)"}`,
  color: isActive ? "var(--th-accent)" : "var(--text-secondary)",
}}>…</button>
```

**Documented exception to the ≥44px tap rule** (§7): chips in a horizontally-scrollable row are 25-30px tall. The exception is allowed because the row itself is the scroll target — chips are flick-selected, not pixel-tapped. Lint allows this pattern when wrapped in a `.flex` parent with `overflow-x-auto`.

**Scroll-bar spacing rule (universal — applies to every horizontally-scrolling chip / date / icon / pill row, not just §3.8 store-picker):** the scroll container must reserve **at least 12px of bottom padding** (`pb-3` Tailwind, or `paddingBottom: 12` inline) below the interactive items. Native scrollbars (Chrome, mobile WebKit) render directly under the content; without padding they sit on top of the chips/dates and visually crowd them. Designated by Jett 2026-05-29 after the cash dashboard + Sales date strip both shipped with `pb-1` (4px) and felt cramped. **Tables and code blocks are NOT included** — table cells already pad themselves, and code overflow is read-only.

### 3.9 Table

```jsx
<div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
  <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontFamily: "inherit" }}>
    …
  </table>
</div>
```

- Every table wraps in `overflowX: "auto"`. The table itself gets explicit `minWidth`.
- **On mobile, the table scrolls inside its container — the page never scrolls horizontally.** Pages doing horizontal page-scroll because a table broke out are bugs.
- Row label/name text: `whiteSpace: "nowrap"; overflow: "hidden"; textOverflow: "ellipsis"`.
- Row money / count / date columns: **never truncated** (Principle 7). If a number wouldn't fit, widen the column; never ellipsis a value the user needs to read in full.

#### Sticky first column (frozen labels) — use the primitive

When a wide table freezes its first column (`position:sticky; left:0`) so the row labels stay visible while data columns scroll, the sticky cells **must carry a SOLID, opaque background** — otherwise the horizontally-scrolled columns bleed straight through them (labels and numbers overlap on scroll). The transparent surface tints (`--surface-col-header` @5%, `--surface-alt-row` @1.5%, `--surface-card`, any `*-bg` semantic, `transparent`) are correct for *non-sticky* headers but **wrong on sticky cells.**

**Always use the primitive** — never hand-roll the sticky styles:

```jsx
import { stickyColHeader, stickyColCell } from "@/components/primitives";

<th style={stickyColHeader({ minWidth: 160 })}>Product</th>
…
<td style={stickyColCell(rowIndex, { fontWeight: 600 })}>{row.label}</td>
```

- `stickyColHeader()` → solid `--surface-col-header-solid`, z-index above data, right divider.
- `stickyColCell(rowIndex)` → solid alternating `--base-bg` / `--surface-alt-row-solid` (matches the row tint, but opaque).
- For special/colored rows (totals, kiosk, "delta" rows), the sticky cell still needs a **solid** tint — use a `-solid` token (e.g. `--warning-bg-solid`), never the transparent semantic `*-bg`.
- If you spread an existing sticky base style and only need the background, `stickyColBg(rowIndex)` returns the solid value.

**Enforced:** the design-lint `sticky-transparent-bg` rule blocks any sticky cell — frozen first column (`left:0`) **or** sticky header row (`top:0`) — whose background is a non-solid token. It's build-breaking, so neither the horizontal nor vertical bleed bug can ship.

### 3.10 Empty state

```jsx
<div style={{
  padding: "48px 16px", textAlign: "center",
  color: "var(--text-muted)", fontSize: 13,
}}>
  <FileText size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
  No submissions found.
</div>
```

### 3.11 Loading state

**Default — inline text.**

```jsx
<div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
  Loading…
</div>
```

**Long lists only — skeleton pulse** (Tailwind `animate-pulse` utility allowed).

```jsx
{[...Array(5)].map((_, i) => (
  <div key={i} className="animate-pulse" style={{
    height: 40, borderRadius: 8, background: "var(--surface-subtle)", marginBottom: 12,
  }} />
))}
```

Spinners (rotating icons) are banned — they don't render predictably on slow mobile networks and they signal nothing about progress.

### 3.12 Error state

```jsx
<div style={{
  background: "var(--error-bg-medium)",
  border: "1px solid var(--th-error)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--th-error)",
  fontSize: 12, fontWeight: 600,
  display: "flex", alignItems: "center", gap: 8,
}}>
  <AlertTriangle size={14} />
  Failed to load. Tap to retry.
</div>
```

Tappable when retryable. Never expose a raw error/stack to the user — write a sentence they can act on.

### 3.13 Save bar / dirty form pattern

Sits inside the form (not floating). Disabled until dirty. Saved confirmation inline next to the button, 4-second pulse.

```jsx
<div className="flex justify-end gap-2">
  {savedAt && Date.now() - savedAt < 4000 && (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--th-success)" }}>
      <CheckCircle2 size={12} /> Saved
    </span>
  )}
  <button disabled={!dirty || saving} style={/* Primary button, disabled state swaps tokens per §3.2 */}>
    <Save size={12} /> {saving ? "Saving…" : "Save"}
  </button>
</div>
```

Saved confirmation is inline, not a toast. Toasts are reserved for cross-page success messages (rare).

### 3.14 Global nav cluster

**Source of truth:** `src/components/layout/header.tsx`.

Top-right of every page (mobile + desktop): **Back** (`ChevronLeft`) · **Home** (`Home`) · **ThemeToggle**. Circular icon buttons per §3.3. Back falls back to `/` when there's no history. Both Back and Home are hidden on `/`.

**Page-level back buttons are banned.** The header owns Back. Local-state nav (Previous Day arrow, Fleet view toggle, wizard step-back per §3.18, accordion arrows) is not "page back" and remains allowed.

### 3.15 Icons

**`lucide-react` exclusively.** No other icon libraries (Heroicons, Feather, Font Awesome, Material Icons, React-Icons, raw inline-SVG paths with custom geometry). This is a hard rule, not a preference — mixing icon libraries breaks visual consistency in subtle ways (stroke weight, optical sizing, padding) that compound across the app.

```jsx
import { ChevronRight, GripVertical, FileText, Save, X } from "lucide-react";
```

**Canonical sizing in context** (don't invent new sizes without a reason):

| Use | Size | Color |
|---|---|---|
| Row chevrons / inline carets | 13 | `var(--text-dimmer)` |
| Nav chevrons / breadcrumb arrows | 14 | `var(--text-secondary)` |
| Button icons (inline with text) | 12-14 | inherit from button text color |
| Section header icons | 14-16 | `var(--th-accent)` |
| Empty-state icon | 32 | `var(--text-muted)` at `opacity: 0.3` |
| Modal close (X) | 18 | `var(--text-muted)` |
| Stepper +/- | not lucide — typographic `−` and `+` per §3.7 |

**Banned Unicode glyphs in UI** (use lucide instead):

- `←` `→` `↑` `↓` — use `<ArrowLeft>` / `<ArrowRight>` / `<ArrowUp>` / `<ArrowDown>`
- `⠿` (braille drag handle from old doc) — use `<GripVertical>`
- Native checkmark glyphs in custom checkboxes — use `<Check>`

ASCII operators (`+`, `-`, `=`, `>`, `<`) in textual content remain ASCII per §5.

### 3.16 Progress bar / step indicator

For wizards (e.g. the store onboard flow) and long-running operations. No numbers, no step labels — the line alone communicates progress.

```jsx
<div style={{
  height: 3, background: "var(--surface-input)", borderRadius: 999, overflow: "hidden",
}}>
  <div style={{
    height: "100%", borderRadius: 999,
    width: `${pct}%`,
    background: isLastStep ? "var(--th-success)" : "var(--th-accent)",
    transition: "width .3s ease",
  }} />
</div>
```

- Track: `var(--surface-input)`, 3px tall, fully rounded (radius 999 — exception per §2 radius scale).
- Fill: `var(--th-accent)` during the flow, `var(--th-success)` on the final step (signals completion).
- Transition: `.3s ease` on width changes only. No other animations on the bar.
- For determinate operations (uploads, exports), `pct` is the real progress. For indeterminate (loading), use §3.11 skeleton — never animate a progress bar with no real progress signal.

### 3.17 Collapsible / accordion section

For grouped lists where a category header expands to reveal child rows (e.g. tea / snacks / merch categories in the giveaway form, or grouped settings panels).

```jsx
<button
  onClick={toggle}
  aria-expanded={!isCollapsed}
  className="w-full flex items-center justify-between"
  style={{
    padding: "8px 14px",
    background: "var(--surface-subtle)",       // neutral grouping tint — NOT a status color
    border: "none", borderBottom: isCollapsed ? "none" : "1px solid var(--border-section)",
    cursor: "pointer", fontFamily: "inherit",
  }}>
  <span style={{
    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em",
    color: "var(--text-secondary)",
  }}>
    {category}
  </span>
  <div className="flex items-center gap-2">
    <span style={{ fontSize: 10, color: filled > 0 ? "var(--th-success)" : "var(--text-dimmer)" }}>
      {filled}/{total}
    </span>
    {isCollapsed
      ? <ChevronDown size={12} color="var(--text-muted)" />
      : <ChevronUp size={12} color="var(--text-muted)" />}
  </div>
</button>
```

- **Neutral grouping surface** — `--surface-subtle` background with `--text-secondary` label. Accordion category headers are organizational, not status. Per §0 Principle 3 and §2 warn-scope, the warn / amber family is reserved for caution / needs-action; using it here would turn every collapsed section into a false warning state.
- Visual separation between the header and the card body comes from the slightly-different `--surface-subtle` bg + the divider line when open, not from a color tint.
- The `filled/total` indicator on the right side **does** use `--th-success` when `filled > 0` because that's a real positive-state signal about the category's data, not decoration on the header itself.
- Header is fully clickable (the `<button>` wraps the whole row).
- `aria-expanded` reflects open state for screen readers.
- Default-collapsed for forms with many categories; default-expanded for short read-only lists.

### 3.18 Wizard / multi-step form navigation

For multi-step flows (store onboard, end-of-month close, multi-section forms). The nav row sits at the bottom of each step.

```jsx
<div className="flex items-center justify-between gap-2" style={{
  padding: "14px 16px", borderTop: "1px solid var(--border-section)", marginTop: 8,
}}>
  <Button variant="secondary" onClick={prevStep} disabled={isFirstStep}>
    <ChevronLeft size={14} /> Back
  </Button>
  <div className="flex items-center gap-2">
    <Button variant="ghost" onClick={saveDraft}>Save Draft</Button>
    {isLastStep
      ? <Button variant="success" onClick={submit}>Submit</Button>
      : <Button variant="primary" onClick={nextStep}>Next <ChevronRight size={14} /></Button>}
  </div>
</div>
```

**Position rules:**
- **Back** — secondary variant, left side. **This is the allowed step-back referenced in §3.14, NOT a page-level back button.** Step-back stays inside the wizard's flow (calls `prevStep()`); the global header still owns page-back via `router.back()`. §3.14's page-back ban does not apply here.
- **Save Draft** — ghost variant, center. Optional per flow; include when the wizard is long enough that an interruption is likely.
- **Next** — primary variant, right side. Includes the `<ChevronRight>` icon after the label.
- **Submit** — success variant, replaces Next on the final step. No icon; the variant change signals finality.

**Behavior rules:**
- **Scroll to top on every Back / Next click:** `window.scrollTo({ top: 0, behavior: "smooth" })`. The wizard never strands the user at the bottom of the previous step's content.
- **Disabled Back on the first step** — token-swap per §3.2 disabled state, not opacity-only.
- **Identity / first-step layout:** the first step (typically "who are you / what is this") drops the card/table wrapper and renders the form on the page background. Subsequent steps use the standard card layout.
- **All categories collapsed by default** inside any wizard step that uses §3.17 accordions.

---

## Section 4 — Forbidden patterns

### From shadcn (CSS classes)

- `bg-card`, `bg-background`, `bg-muted`, `bg-popover`, `bg-accent`
- `text-foreground`, `text-muted-foreground`, `text-popover-foreground`
- `border-border`

### From shadcn (component imports in new/rethemed work)

- `<Card>`, `<Badge>`, `<Input>`, `<Label>`, `<Select>`, `<Table>`, `<Skeleton>`, `<EmptyState>`

### Icon library imports

- `react-icons`, `@heroicons/react`, `feather-icons`, `@mui/icons-material`, any non-`lucide-react` icon package. Lucide is the only allowed icon library per §3.15.
- **Hand-rolled icon SVGs in component code** — if it's an icon (a small symbolic glyph in a button, badge, status indicator, or inline with text), use lucide. Don't copy-paste `<svg viewBox="0 0 24 24"><path d="…" /></svg>` for what is functionally an icon.

**Inline SVG is NOT banned in general.** Legitimate non-icon SVG use is allowed and expected:
- Charts (recharts, d3, weather-demand visualizations)
- Branded logos and illustrations
- Custom data visualizations (gantt rows, sparklines, heatmaps)
- Any one-off graphic that isn't a symbolic icon

The rule is "don't reinvent icons" — not "no inline SVG anywhere." Principle 4's SVG-fill exception applies to icons and graphics equally.

### Tokens / values

- Any `#hex` color in a `style` prop (except SVG `fill` / `stroke`).
- Any `rgba(...)` color in a `style` prop, except the modal backdrop `rgba(0,0,0,0.55)`.
- `var(--popover)`, `var(--popover-foreground)`, `var(--muted-foreground)` — shadcn tokens, banned in favor of `var(--card)` / `var(--card-foreground)` / `var(--text-muted)`.
- Hardcoded `font-family` — always `fontFamily: "inherit"`.
- Hardcoded `color-scheme` in component code — handled by the global rule in `globals.css`.

### Geometry / behavior

- Solid-fill heavy buttons (any variant). Use the tinted Diagnose pattern.
- `borderRadius: 999` on anything that isn't a circular icon button, drag handle, or decorative dot.
- Circular / pill badges — always rectangle `borderRadius: 4`.
- `type="number"` on inputs — always `type="text" inputMode="numeric"`.
- Page-level back buttons (header owns Back).
- `<PageHeader>` shadcn component — write inline per §3.1.
- HTML5 `draggable` on mobile — use touch events or arrow buttons.
- Spinners (rotating icons) — use inline text or skeleton per §3.11.
- Inline responsive spacing (`style={{ gap: 16 }}` when you mean "12 on mobile, 16 on desktop") — use Tailwind layout utilities (`gap-3 sm:gap-4`).
- Inline `gridTemplateColumns: "1fr 1fr"` (or any inline grid-template) for responsive forms — use Tailwind layout utilities (`grid-cols-1 sm:grid-cols-2`) per §3.6. Inline grid-template can't honor the breakpoint, so the layout stays two-column on mobile and breaks the mobile-first rule.
- Truncating financial / numeric / date values — labels only per Principle 7.

### Data / storage

- `localStorage` for persistent data — use DB.
- Color-only state signals — always pair color with icon or text.

### Color misuse

- Yellow / amber for financial variance — variance stays green/red per §0 Principle 3 and §2 warn-family scope.
- Accent color (sky blue) used decoratively — reserved for primary action and active state.

---

## Section 5 — Text & glyph rules

| Use | Token / glyph |
|---|---|
| Minus sign | ASCII hyphen-minus `-` (U+002D) by default. `−` (U+2212) now renders correctly in PDFs via `createPdf()` (§6) — but is still lint-flagged in source `.tsx`; use a `design-lint-allow` reason where a true minus is genuinely needed. |
| Percentage points | `%`, never `pp` |
| Greek delta | `Δ` (U+0394) now PDF-safe via `createPdf()` (Inter, §6) — the Helvetica blocker is resolved. Still lint-flagged in source for on-screen consistency; use `design-lint-allow` where intended. |
| Middle dot separator | ASCII pipe `\|` default; `·` (U+00B7) is fine on-screen and now PDF-safe via `createPdf()` (§6). |
| Arrows | lucide icon, not Unicode `→` |
| Drag handle | `<GripVertical />` from lucide, not Unicode `⠿` (deprecated from the old doc) |

**Scope — icons vs. prose (Decision 33).** These rules govern glyphs used **as icons / affordances** — buttons, status indicators, data-label icons, legends, lock states. Emoji are never icons here; use lucide (🌡️→`Thermometer`, 🔒→`Lock`, 🟡→`Circle` in a canon status color, etc.). They do **not** apply to glyphs used as **typographic punctuation inside running prose or math** — a `→` in an explanatory sentence ("Open → Noon: 90% → 50%"), the `·` separator, or `÷`/`×` in a formula are characters, not icons; leave them. Convert a `→`/emoji only when it stands in for an icon.

---

## Section 6 — PDF rules

- Single PDF library: `jspdf` v4.2.1.
- jsPDF's built-in Helvetica is Type-1, Latin-1 only — it breaks every Unicode glyph (`Δ`, `−`, `·`, currency, etc.). **Never use `new jsPDF()` directly.**
- **Shipped (Phase 5):** `src/lib/pdf/create-pdf.ts` exports `createPdf(options?)`, which constructs the doc, registers a **subsetted Inter** (Regular + Bold, ~27KB each — Latin + Latin-1 + General Punctuation + currency + Greek `Δ` + `−`/`·`, all coverage-verified) via `addFileToVFS` + `addFont`, and sets Inter as the default font. Font bytes live in `src/lib/pdf/inter-fonts.ts` (base64). **Every PDF entry point must call `createPdf()` instead of `new jsPDF()`.**
- Three call sites, all migrated: `weather-demand-dashboard.tsx` (~3226), `admin/data-integrity/page.tsx` (~2200), `product-tracking/flavor-profiles/page.tsx` (~382). All `setFont("helvetica", …)` calls in those files were changed to `setFont("Inter", …)`; `jspdf-autotable` calls pass `styles: { font: "Inter" }`.
- `createPdf` is dynamically imported at each call site (`await import("@/lib/pdf/create-pdf")`) so jsPDF + the font bytes stay out of the main bundle (§8 lazy-load preserved).
- Glyphs now render correctly in PDFs, but the §5 source-glyph lint still applies to `.tsx` — see §5 for when to use a `design-lint-allow` reason.

---

## Section 7 — Accessibility baseline

- **Tap targets ≥44×44px** on every interactive element a thumb hits. Documented exception: chips in a horizontal scrollable row (§3.8) — the row is the tap zone.
- **Color contrast ≥4.5:1** for body text, ≥3:1 for large text. All canonical tokens meet this in both themes; new tokens must be verified before they land in `globals.css`.
- **Focus rings visible** — never `outline: none` on a focusable element without providing an alternative `:focus-visible` ring.
- **`aria-label` on every icon-only button** (header back/home, table action buttons, close buttons, etc.).
- **No color-only state signals.** A red value isn't enough — pair with a sign (`+` / `-`) or word ("over" / "under") or icon.
- **Keyboard navigable** — every interactive element reachable via Tab, every modal closes on Esc.

---

## Section 8 — Performance baseline

- **Animations ≤200ms.** Standard `transition: "all .15s"`. Longer transitions reserved for progress bars (`.3s ease`).
- **No render-blocking font loads.** Inter is loaded via `next/font/google` in `src/app/layout.tsx` — self-hosted and pre-loaded, no external fetch at runtime.
- **No layout shift after first paint.** Reserve space for async content (skeleton placeholders that match expected dimensions). Don't conditionally insert content above-the-fold.
- **Lazy-load heavy widgets.** PDF generation, charts, and modals use dynamic `import()` so they don't bloat the main chunk. See `weather-demand-dashboard.tsx:3179` for the jspdf example.

---

## Section 9 — Enforcement

- **Doc** (this file, once promoted) is the source of truth.
- **Kitchen-sink page at `/admin/design-system` — built (`b8587e7`).** Renders the primitives in §3 with file-path references. Registered in `src/lib/auth/page-registry.ts` with `requiresPermission` so it auto-gates at the `AUTH_DISABLED` flip.
- **Lint script** `npm run lint:design` scans `src/components/**/*.tsx` and `src/app/**/page.tsx` for: hex/rgba literals in `style` props (allowlisted exceptions documented inline), banned shadcn tokens, banned `var(--popover)` / `--muted-foreground`, banned Unicode glyphs (`−`, `Δ`, `pp` token), missing `fontFamily: "inherit"` on inputs/selects/buttons, inline responsive spacing values that should be Tailwind utilities.
- **CI / enforcement (Phase 4 live — see Decision 7, amended 2026-05-29):** `lint:design` is wired into `npm run build` as its **first** step (before `next build`, so it fails fast), and exits non-zero on any real violation — so the Railway deploy blocks on design-token drift. It is **not** wired into `npm run typecheck`. The team pushes straight to `main` with no PR CI, so the deploy build is the only enforcement surface; the original "separate PR check" model is deferred to the day PRs are adopted (Decision 7(b)). **Accepted tradeoff:** lint now gates *deploys* — a violation on `main` can block an unrelated hotfix. Escape hatch (implemented + probe-verified): `SKIP_DESIGN_LINT=1` bypasses the build-breaking exit for emergency pushes while still printing the bypassed violations. Stale shadcn-import-baseline entries warn but do **not** break the build (separate exit path). The `--self-test` mode (`npm run lint:design -- --self-test`) asserts every rule fires and every documented exception stays silent.
- **Auth flip:** when `AUTH_DISABLED` flips false, `/admin/design-system` is admin-gated automatically via its `page-registry.ts` entry.
- **Source of truth note:** when this doc and a built component disagree, this doc wins — update the component to match, then note the reconciliation in the changelog above rather than editing the doc to match drifted code.
