# design/ — the design source of truth

**Everything here defines the look, and it is carried from theAPlink verbatim.** The rule
that folder was built around holds here too: *do not re-theme or approximate.* Savoy
Capital shares the HTeaO/theAPlink visual language — same palette, same primitives, same
patterns — so a screen built here should be indistinguishable in style from a screen built
there.

## What's in here

- `AP_DESIGN_REFERENCE.md` — **READ FIRST.** The pattern cheat-sheet: palette, typography,
  and copy-paste patterns for shell / tables / buttons / tabs / modals / cards / pills /
  inputs, extracted from the live components. (Filename keeps its theAPlink spelling
  because the file is carried byte-for-byte; the patterns in it are not AP-specific.)
- `palette.ts` — the `C` palette (verbatim). **Every color comes from here. No raw hex.**
- `DESIGN_SYSTEM.md` — the full upstream design system: principles, primitives, glyphs,
  PDF rules, accessibility.
- `MOBILE_REFERENCE.md` — the ≤767px surface: what changes, what doesn't.
- `MOBILE_AUDIT_PLAYBOOK.md` — how a mobile audit is run and what it checks.
- `inter-fonts.ts` — Inter Regular+Bold (base64) for PDF generation (verbatim).
- `globals-reset-snippet.css` — the global reset bits the look relies on, especially the
  global cursor rule — **do not add per-element `cursor: pointer`.**
- `exemplars/` — **frozen snapshots** of three real screens (`ap-aging.tsx` a table screen,
  `tbc-reconcile.tsx` a matrix screen, `payment-check.tsx` a modal/tab screen). Copy their
  *structure and patterns* 1:1 when building new screens. Their subject matter is
  theAPlink's AP domain and is not expected to mean anything here — read them for the
  shape, not the content.

## Mirrors — not yet enforced

In theAPlink nothing in the app imports from `design/`; the runtime holds its own copy, and
three pairs are kept byte-identical by a hard gate (`npm run lint:design`, no baseline, no
waiver). **That gate does not exist in this repo yet** — there is no app code to mirror
into and no `scripts/` here.

Treat this as the standing intent, to be made real when the app's component layer lands:

| `design/` | app copy (when it exists) |
|---|---|
| `palette.ts` | the runtime palette module |
| `globals-reset-snippet.css` | the app's global stylesheet |
| `inter-fonts.ts` | the PDF font module |

Until the gate is built, "source of truth" is a convention held by hand. Do not write it up
anywhere as enforced — an unenforced rule described as enforced is worse than an
acknowledged convention.

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
