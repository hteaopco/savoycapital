# theAPlink — AP Design Reference (source of truth)

> **RULE: everything must be IDENTICAL to the current HTeaO AP design. Nothing different.**
> This folder is the canonical reference. When in doubt, copy the exemplar components in
> `design/exemplars/` verbatim and reuse `palette.ts`. Do not re-theme, re-approximate, or
> "improve" the look. `DESIGN_SYSTEM.md` (copied verbatim here and in `docs/`) is the full
> upstream spec; this file is the AP-specific cheat-sheet extracted from the live components.

Carried verbatim in this folder:
- `palette.ts` — the `C` palette. **Every color comes from here. No raw hex in components.**
- `DESIGN_SYSTEM.md` — the full design system (glyphs, PDF rules, accessibility, etc.).
- `inter-fonts.ts` — the subsetted Inter (Regular + Bold) base64 for PDFs. Carry verbatim.
- `exemplars/` — three real screens (a table screen, a modal/tab screen, a matrix screen)
  to copy patterns from 1:1.
- `globals-reset-snippet.css` — the global reset bits AP relies on (notably the global
  cursor rule — **do not add per-element `cursor: pointer`**).

---

## 1. Palette (`C`) — the whole look

Forced **light** palette (the AP portal opts out of the dark theme). Import `{ C }` from
the palette module; use tokens only.

```
bg           #ffffff      bgAlt        #f8fafc      bgRow        #f1f5f9
border       #e2e8f0      borderStrong #cbd5e1
text         #0f172a      textMuted    #64748b      textDim      #94a3b8
accent       #0284c7      accentBg     #e0f2fe      accentBorder #bae6fd
green        #16a34a      greenBg      #dcfce7      greenBorder  #bbf7d0
amber        #b45309      amberBg      #fef3c7      amberBorder  #fde68a
red          #dc2626      redBg        #fef2f2      redBorder    #fecaca
overlay      rgba(15, 23, 42, 0.45)
```

Tone convention used across AP:
- **accent (blue)** = primary actions, active state, links, "extra/info".
- **green** = success / charge posted / correct.
- **amber** = warning / mismatch / due-soon / overridden.
- **red** = error / overdue / missing / delete.
- **default** = neutral surfaces (`bg` / `bgAlt` zebra).

---

## 2. Hard rules (non-negotiable — these are lint-enforced upstream)

- **Inline styles only** for theming. Tailwind utility classes are allowed **only** for
  layout (`flex`, `inline-flex`, `items-center`, `justify-between`, `flex-wrap`, `space-y-*`,
  `animate-spin`, `animate-pulse`) — never for color/spacing/theming.
- **No raw hex / rgb** in components — always a `C` token.
- **lucide-react icons exclusively.** No other icon set, no inline SVG.
- **No `<input type="number">`** — use `type="text"` with `inputMode="numeric"|"decimal"`.
- **`fontVariantNumeric: "tabular-nums"`** on every money / quantity / count value.
- **Inter** is the font (`fontFamily: "inherit"` on inputs/tables so they pick it up).
- **No per-element `cursor: pointer`** — a global cursor rule already covers it.
- Dark-theme note: the AP portal is a **forced-light shell**. Keep it light.

---

## 3. Typography scale (px / weight) — as used

| Use | size | weight | notes |
|---|---|---|---|
| Screen title | 18 | 800 | `C.text` |
| Screen subtitle / help | 13 | 400 | `C.textMuted`, `maxWidth ~640` |
| Section/card heading | 13–14 | 700–800 | |
| Table header (th) | 10 | 700 | UPPERCASE, `letterSpacing:".06em"`, `C.textDim` |
| Table cell (td) | 12 | 400–700 | |
| Stat card label | 10 | 800 | UPPERCASE, `letterSpacing:".06em"` |
| Stat card value | 20–22 | 800 | `tabular-nums` |
| Buttons | 12–13 | 600–700 | |
| Pills / small tags | 10–11 | 700–800 | |
| Group header row | 11 | 800 | `C.accent`, `letterSpacing:".04em"` |

Border-radius scale: **6** (small controls), **7** (pill tab), **8** (buttons/inputs),
**10** (cards/panels), **12** (modals). Standard control padding `"6px 10px"`–`"8px 16px"`.

---

## 4. Component patterns (copy these exactly)

### Screen shell
```tsx
<div className="flex flex-col" style={{ gap: 14 }}>
  <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Title</div>
      <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 640 }}>Subtitle…</div>
    </div>
    {/* right-aligned action(s) */}
  </div>
  …
</div>
```

### Primary button (accent)
```tsx
<button className="inline-flex items-center"
  style={{ gap: 8, padding: "9px 16px", borderRadius: 8, border: "none",
           background: C.accent, color: "#ffffff", fontSize: 13, fontWeight: 700 }}>
  <Icon size={16} /> Label
</button>
```
`#ffffff` on an accent button is the one allowed literal (button text on solid accent).

### Secondary / bordered button
```tsx
style={{ gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
         background: C.bg, color: C.text, fontSize: 13, fontWeight: 600 }}
```

### Small row-action button (View / File / edit)
```tsx
style={{ gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
         background: C.bg, color: C.accent, fontSize: 11, fontWeight: 600 }}
```
Destructive variant: `border: C.redBorder`, `background: C.redBg`, `color: C.red`.

### Tab / pill toggle group
```tsx
<div className="inline-flex" style={{ gap: 4, padding: 4, borderRadius: 10,
     background: C.bgAlt, border: `1px solid ${C.border}` }}>
  {/* each pill */}
  <button style={{ gap: 6, padding: "6px 12px", borderRadius: 7, border: "none",
    background: active ? C.bg : "transparent", color: active ? C.accent : C.textMuted,
    fontSize: 12, fontWeight: 700, boxShadow: active ? `0 1px 2px ${C.border}` : "none" }}>
    <Icon size={14} /> Label
  </button>
</div>
```

### Table
Wrap in `border:1px C.border; borderRadius:10; overflow:hidden`, then an
`overflow-x:auto` scroller, then the table. Zebra rows `i % 2 ? C.bgAlt : C.bg`.
```tsx
const th = { textAlign:"left", padding:"6px 10px", fontSize:10, fontWeight:700,
  textTransform:"uppercase", letterSpacing:".06em", color:C.textDim,
  borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" };
const td = { padding:"6px 10px", fontSize:12, borderBottom:`1px solid ${C.border}` };
const tdNum = { ...td, textAlign:"right", fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" };
// table: { width:"100%", minWidth:<n>, borderCollapse:"collapse", fontFamily:"inherit" }
```
Sortable header: same `th` + `cursor:"pointer"`, active column colored `C.accent` with a
`<ChevronUp/ChevronDown size={12}/>`. Sticky first column: `position:"sticky", left:0,
zIndex:1, background:<row bg>`.

> **On `cursor:"pointer"`** — the global rule in `globals.css` covers `button`,
> `[role="button"]` and `a` **only**, so a clickable `<th>` / `<tr>` / `<label>` / `<div>`
> genuinely needs its own `cursor:"pointer"` (as above). On a `<button>` or `<a>` it is
> redundant — don't write it there. The `cursor-pointer` lint can't tell the two apart from
> a regex, so the legitimate cases carry `// design-ok: <element> is not covered by the
> global cursor rule`.

### Stat card
```tsx
<div style={{ padding:"12px 14px", borderRadius:10, background:C.bg,
  border:`1px solid ${C.border}`, minWidth:150, flex:"1 1 150px" }}>
  <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
    letterSpacing:".06em", color:C.textDim }}>LABEL</div>
  <div style={{ fontSize:22, fontWeight:800, color:C.text,
    fontVariantNumeric:"tabular-nums", marginTop:2 }}>$0.00</div>
  <div style={{ fontSize:11, color:C.textMuted, fontVariantNumeric:"tabular-nums" }}>sub</div>
</div>
```
Tone variants swap `bg/border/color` to the red/amber/green/accent Bg+Border+base pair.

### Status / result pill
```tsx
<span style={{ padding:"…", borderRadius:8, background:C.amberBg,
  border:`1px solid ${C.amberBorder}`, color:C.amber, fontSize:12, fontWeight:700 }}>…</span>
```

### Input / search box
```tsx
<div className="inline-flex items-center" style={{ gap:8, padding:"6px 10px",
  borderRadius:8, background:C.bg, border:`1px solid ${C.border}` }}>
  <Search size={14} style={{ color:C.textDim }} />
  <input style={{ flex:1, border:"none", outline:"none", background:"transparent",
    fontSize:13, fontFamily:"inherit", color:C.text }} />
</div>
```
Checkbox (custom): a 16×16 box, `border:1px ${on?C.accent:C.borderStrong}`,
`background:on?C.accent:C.bg`, with a white `<Check size={12}/>` when on.

### Modal / overlay
```tsx
<div style={{ position:"fixed", inset:0, background:C.overlay, display:"flex",
  alignItems:"center", justifyContent:"center", padding:16, zIndex:70 }} onClick={onClose}>
  <div onClick={(e)=>e.stopPropagation()} style={{ background:C.bg, borderRadius:12,
    border:`1px solid ${C.border}`, width:"min(560px,100%)", maxHeight:"84vh",
    display:"flex", flexDirection:"column", overflow:"hidden" }}>
    {/* header: 12px 16px, borderBottom C.border, title 14px 700 + X close */}
    {/* body: overflowY:auto */}
    {/* footer: 12px 16px, borderTop C.border, Cancel (bordered) + primary action */}
  </div>
</div>
```
Document viewer modal uses an `<iframe>` filling the body + an "Open in new tab" link.

### Empty / placeholder state
```tsx
<div style={{ padding:24, borderRadius:10, border:`1px dashed ${C.borderStrong}`,
  background:C.bgAlt, color:C.textMuted, fontSize:13, textAlign:"center" }}>…</div>
```

### Group header row (in a matrix/list)
```tsx
<td colSpan={n} style={{ padding:"7px 10px", fontSize:11, fontWeight:800,
  letterSpacing:".04em", color:C.accent, background:C.bgAlt,
  borderBottom:`1px solid ${C.border}`, borderTop:`1px solid ${C.border}` }}>Group</td>
```

### Banner (info / warning / success)
Padded `8–10px 12–14px`, `borderRadius:8–10`, the tone's `Bg` + `Border` + base `color`,
`fontSize:12–13`, often with a leading lucide icon and a trailing `X` to dismiss.

---

## 5. Icons (lucide) — sizes used
14–16 in nav/headers/buttons, 12–13 for row actions, 12 inside checkboxes. Common ones in
AP: `RefreshCw` (refresh, `animate-spin` while loading), `Upload`, `Download`, `FileText`,
`Search`, `Plus`, `Trash2`, `Pencil`, `Check`, `X`, `ChevronRight/Down/Up`, `AlertTriangle`,
`ExternalLink`, `Zap`, `Building2`, `CreditCard`, `Receipt`, `CalendarClock`, `ListChecks`,
`FileSpreadsheet`, `LayoutDashboard`, `ClipboardList`, `LayoutGrid`.

---

## 6. Money / dates helpers (keep identical)
```ts
const money = (cents:number) => `$${(cents/100).toLocaleString("en-US",
  { minimumFractionDigits:2, maximumFractionDigits:2 })}`;   // negatives shown as ($x.xx)
const fmtDate = (iso:string|null) => { /* YYYY-MM-DD → MM/DD/YYYY */ };
```
All money is **integer cents** end-to-end; format only at render.

---

## 6b. Mobile (≤767px) — desktop must NOT change

The desktop design above is the primary surface and is **frozen**. Mobile is a
separate, additive layer for ≤767px, covered in full by **`MOBILE_REFERENCE.md`**
(read it before any mobile work). The essentials:

- **Breakpoint 767px.** Branch via Tailwind `md:` (pure show/hide), the SSR-safe
  `useIsMobile()` hook in `src/lib/use-is-mobile.ts` (different content shape), or
  a `@media (max-width:767px)` block in `globals.css` (touch-target floors).
  **Never gate desktop styling behind `isMobile`** — the desktop path stays
  byte-identical, which is the whole safety model.
- **Nav:** desktop sidebar is `hidden md:flex`; mobile gets a top bar + slide-in
  drawer (shared nav body) + a bottom tab bar for the daily drivers.
- **Wide tables:** never leave a raw horizontal-scroll table as the primary
  mobile view. Use `MobileCard`/`MobileCardList` (`mobile-cards.tsx`) for list
  screens, or pin the first column on mobile (the `AgingSummary` `stick()`
  pattern) for action-dense / matrix tables.
- **Detail:** full-screen sheet on mobile (inline → fixed sheet + Back bar;
  centered modal → edge-to-edge). Desktop keeps its inline/centered form.
- All §2 hard rules (C palette, no raw hex, lucide, `tabular-nums`, inline styles)
  apply on mobile too.

## 7. When building any new AP screen
1. Start from an exemplar in `design/exemplars/` — copy its structure.
2. Import `{ C }` from `palette.ts`; never introduce a color outside `C`.
3. Reuse the shell / table / button / modal / card patterns above **verbatim**.
4. Money = cents + `tabular-nums`; icons = lucide; inputs = `fontFamily:"inherit"`.
5. If a pattern isn't covered here, find the closest exemplar and match it — do **not** invent
   a new visual style. Identical, always.
