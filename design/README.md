# design/ — the design source of truth

**Everything here defines the look, and it is carried from theAPlink.** The rule that folder
was built around holds here too: *do not re-theme or approximate.* Savoy Capital shares the
HTeaO/theAPlink visual language — same palette, same primitives, same patterns — so a screen
built here should be indistinguishable in style from a screen built there.

## Divergences from theAPlink

Seven of the ten content files are **byte-for-byte identical** to theAPlink's. Three are not:

| File | Divergence | When |
|---|---|---|
| `DESIGN_SYSTEM.md` | § 0.8 — a **content crossfade** may run to 400ms, against the blanket 200ms animation ceiling. UI feedback keeps the 200ms limit. | 2026-08-23, owner |
| `DESIGN_SYSTEM.md` | § 0.8 / § 9 — a **spaced secondary control** may go to 36×36px, against the blanket ≥44×44px tap-target floor. Primary actions, list rows and form controls stay at 44. | 2026-08-23, owner |
| `MOBILE_REFERENCE.md` | header, § 2 — **mobile-first; desktop is not frozen.** theAPlink's freeze is a retrofit stance for an app with an accumulated desktop surface. Nothing here is frozen, and `DESIGN_SYSTEM.md` § 1.1 is mobile-first. | 2026-08-24, owner |
| `MOBILE_REFERENCE.md` | § 1 — **a second breakpoint is allowed** when derived from arithmetic and shown at the call site, against "exactly one breakpoint." `FundAllocation.tsx`'s terms panel is the case (`2xl:` today); `DESIGN_SYSTEM.md` § 3.x uses `sm:`/`lg:` throughout. | 2026-08-24, owner |
| `MOBILE_REFERENCE.md` | § 6 — **the tap-target floor is 44px, written per component** (`min-h-[44px] md:min-h-0`), against a 40px floor supplied globally by `globals.css`. **No `@media (max-width:767px)` block exists in this repo**, so nothing is auto-floored. | 2026-08-24, owner |
| `MOBILE_REFERENCE.md` | § 1 / § 3 / § 4 / § 5, § 8, § 9 — **the named machinery does not exist here**: no `useIsMobile()`, `mobile-cards.tsx`, `.ap-chip-strip`, or `lint:mobile`. The coverage tables are theAPlink's numbers; ours is **unmeasured**. Patterns kept, claims corrected. | 2026-08-24, owner |
| `MOBILE_AUDIT_PLAYBOOK.md` | header, § 0 — **both contract invariants replaced**: desktop is not frozen, and money-safety becomes the **auth boundary** (no money-writing surface exists; never widen `src/proxy.ts` for a layout). | 2026-08-24, owner |
| `MOBILE_AUDIT_PLAYBOOK.md` | § 1, § 5, § 6 — **the loop is rewired to the gates that exist**: no Prisma, no cron, and no *mobile* baseline. `verify` is typecheck + eslint + design-lint; CI adds `next build`; merge-on-green is standing authorization. | 2026-08-24, owner (§ 1.1/§ 6 rows re-corrected 2026-08-24 when `design-lint` landed) |

**On "verified by checksum".** That phrase was carried from theAPlink and it overstates what
is possible here: **there is no theAPlink checkout in this repo to checksum against**, so the
identity of the seven is a claim held by hand, not a computed fact. Said plainly per
`.claudet/README.md` rule 3 — an unenforced rule described as enforced is worse than an
acknowledged convention. What *is* checkable, and what the banners exist for, is the
narrower claim: every file that diverges says so at the top and names how.

**Each of those three files carries a banner at the top saying the same thing**, so a diff
against theAPlink explains itself and a reader who opens only one file still learns that it
diverges. **Add to that table before amending anything else here** — an undocumented
divergence turns "carried from theAPlink" into a claim nobody can check, and the value of
this folder is that the claim is checkable.

## What's in here

- `AP_DESIGN_REFERENCE.md` — **READ FIRST.** The pattern cheat-sheet: palette, typography,
  and copy-paste patterns for shell / tables / buttons / tabs / modals / cards / pills /
  inputs, extracted from the live components. (Filename keeps its theAPlink spelling
  because the file is carried byte-for-byte; the patterns in it are not AP-specific.)
- `palette.ts` — the `C` palette (verbatim). **Every color comes from here. No raw hex.**
- `DESIGN_SYSTEM.md` — the full upstream design system: principles, primitives, glyphs,
  PDF rules, accessibility.
- `MOBILE_REFERENCE.md` — the ≤767px surface: what changes, what doesn't. **Amended for
  savoycapital — read its banner first;** it names the machinery it describes that this repo
  does not have, and § 6 in particular will mislead you about tap targets if you skip it.
- `MOBILE_AUDIT_PLAYBOOK.md` — how a mobile audit is run and what it checks. **Amended for
  savoycapital — read its banner first.** The rubric and triage carry; the loop's wiring
  does not. Owned by the mobile seat, `.claudet/AGENTS/MOBILE.md`.
- `inter-fonts.ts` — Inter Regular+Bold (base64) for PDF generation (verbatim).
- `globals-reset-snippet.css` — the global reset bits the look relies on, especially the
  global cursor rule — **do not add per-element `cursor: pointer`.**
- `exemplars/` — **frozen snapshots** of three real screens (`ap-aging.tsx` a table screen,
  `tbc-reconcile.tsx` a matrix screen, `payment-check.tsx` a modal/tab screen). Copy their
  *structure and patterns* 1:1 when building new screens. Their subject matter is
  theAPlink's AP domain and is not expected to mean anything here — read them for the
  shape, not the content.

## This folder is not app source

`design/` is excluded from `tsconfig.json`, and it must stay excluded. The exemplars are
frozen `.tsx` snapshots carried from theAPlink: they import `@/components/accounting/palette`
and `@/lib/accounting/...`, paths that exist in that repo and not in this one. Left in the
type-check they fail the build — which is exactly how this exclusion got added, on the first
`next build` this repo ever ran.

Read them. Copy patterns out of them. Never compile them.

## Mirrors — one pair enforced, two not yet

In theAPlink nothing in the app imports from `design/`; the runtime holds its own copy, and
three pairs are kept byte-identical by a hard gate. **That gate exists here as of #20**
(2026-08-24) — `npm run lint:design`, no baseline, no waiver — but it covers **one** pair,
because only one is a real pair today:

| `design/` | app copy | Enforced? |
|---|---|---|
| `palette.ts` | `src/components/palette.ts` | **Yes — hard gate, byte-identical, no baseline and no waiver.** Breaking it fails CI. |
| `globals-reset-snippet.css` | `src/app/globals.css` | **No, and deliberately not.** The app's file is a *documented partial port*: the snippet's `@apply border-border` / `bg-background` lines depend on a shadcn token layer this app does not have, so they are not carried. `globals.css`'s own header says which lines and why. A byte gate here would be wrong, not merely unbuilt. |
| `inter-fonts.ts` | — | **No pair yet.** Nothing generates PDFs, so there is no app copy to mirror. Build one and this row becomes enforceable the same day. |

**What that means for "source of truth."** For the palette it is now a computed fact, not a
convention: the two files cannot drift without a red build. For the other two it remains a
convention held by hand — say it that way, per `.claudet/README.md` rule 3.

## The gap this folder does not cover

Everything here is an **internal-application** design system: dense tables, modals, tabs,
pills, forms — the vocabulary of a portal someone works in. That fits Savoy Capital's
**portfolio monitor** directly, and the exemplars are worth copying 1:1 for it.

It does **not** cover the **public landing page**. A marketing surface for a fund needs a
hero, a display typography scale, brand expression, and layout patterns that no exemplar
here demonstrates. The palette and the principles in `DESIGN_SYSTEM.md` still govern —
tokens not literals, color means something, negative space is the layout — but the patterns
have to be authored rather than copied.

**Do not resolve this by loosening the palette.** If the public page needs something the
tokens can't express, that is a decision to make explicitly and record in
`.claudet/DECISIONS.md`, not a reason to start writing raw hex.
