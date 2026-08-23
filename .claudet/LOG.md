# LOG — savoycapital

Reverse-chronological log of notable changes.

> **Note on this file's future.** theAPlink froze its LOG and now derives change history
> from git (`node scripts/changelog.mjs` — under squash-merge, one merged PR is one entry),
> because hand-appending made it a merge-conflict magnet and let it carry claims that were
> never true. This repo has no such script yet, so this file is hand-written for now. When
> the generator lands, freeze this file rather than keeping both.

- **Landing page cut back to the portfolio; carousel gains autoplay** (2026-08-23, owner's
  changes). The "What we invest in" section and the whole footer are removed — the instrument
  cards were carrying six bracketed placeholders and the owner pulled them "until we get more
  formal." Recent Investments is now the page: it is the hero, its heading is "Our Portfolio",
  and the `<h1>` moved with it. Investor login points at a new `/coming-soon` (noindex — a
  placeholder page ranking for the firm's name is worse than no result).
  Carousel: auto-advances every 3s, with a pause/play button, and any manual move — arrows or
  dots — stops the autoplay for good. `prefers-reduced-motion` sets the initial state, but an
  explicit press overrides it either way, since a play button that does nothing is worse than
  ignoring the preference.
  The image panel is now a FIXED height (200px / 280px at md) rather than min-height. HTeaO's
  mark is taller in aspect than the other two, so the panel used to grow for it and the card
  resized mid-rotation.
  **The securities disclosure went with the footer** — the page now carries none. It was
  placeholder text, not usable language, so nothing of value was lost, but real language has
  to land before the site is promoted to anyone. Still recorded in `FACTS.md`.

- **First deploy is live on Railway** (2026-08-23, owner-confirmed). The public landing page
  is serving. Deploy shape: Nixpacks, `npm run build`, `npm run start`, healthcheck on
  `/api/health`, Node 22 via `.nvmrc`. Nothing about the app changed to make this work — the
  earlier failure was a host pointed at a repo with no `package.json`, and it resolved when
  the app merged to `main`.

- **The app exists: Next.js scaffold + the landing page in real code** (2026-08-23). Built
  in response to a failed deploy — a host had been pointed at a repo with no `package.json`,
  no `railway.json` and nothing any builder could act on, which was the direct consequence
  of the deliberate keep-it-blank decision rather than a regression. Next.js 16, React 19,
  TypeScript strict, Tailwind for layout only, lucide-react for icons, `/api/health` for
  Railway's healthcheck, `railway.json` for the deploy.
  The landing page ports the design canvas: "What we invest in" over a Recent Investments
  carousel with the three investment images. Theming is inline styles off the `C` palette
  with no raw hex, per `design/AP_DESIGN_REFERENCE.md` § 2; responsive sizing uses `clamp()`
  rather than media queries so the rule holds.
  Two build failures found and fixed rather than guessed at: `design/`'s frozen exemplars
  were being type-checked (TS2307 on theAPlink import paths), and the `@eslint/eslintrc`
  shim crashed against `eslint-config-next` 16's native flat config. Both recorded in
  DECISIONS with why the obvious fix is wrong. Verified before commit: clean `npm run build`,
  `npm run verify` green, and the production server serving `/`, `/api/health` and all three
  image assets.

- **`uploads/` added; investment logos moved out of `design/`** (2026-08-23). Three files for
  the landing page's Recent Investments section (Westfield Fluid Controls, HTeaO, Marucci)
  were uploaded into `design/` through the GitHub web UI. Moved to a new top-level
  `uploads/` — a drop-off for raw material handed over from outside the repo, explicitly not
  an asset directory nothing should import from. `design/` is verified byte-identical to
  theAPlink again (10/10 content files); loose uploads sitting in it blur the source-of-truth
  line. `marruci.png` renamed to `marucci.png` to match the company.

- **Architecture folders scaffolded, deliberately empty** (2026-08-23). The directory
  skeleton mirroring theAPlink's shape — `.claude/{hooks,rules}`, `.github/workflows`,
  `docs/`, `prisma/migrations/`, `scripts/`, `src/{app,app/api,components,content,lib}` —
  created and held by `.gitkeep`. Owner's instruction was infrastructure and architecture
  folders only, everything blank outside `design/`. No `package.json`, no configs, no schema,
  no source files, and no `src/lib` domain subfolders — theAPlink's (`accounting`,
  `quickbooks`, `labor`, `tenancy`) are its own and guessing this product's would be
  inventing structure ahead of the decisions that shape it.

- **Product defined; multi-tenancy ruled out** (2026-08-23). Savoy Capital is a private
  investment fund (Rodney Savoy, Jett Dueitt) making PE and private-debt investments — one
  fund, multiple investments, two authenticated users, plus a public landing page for
  prospective clients. `FACTS.md` rewritten from placeholders to the real brief.
  `DECISIONS.md` records that theAPlink's tenancy apparatus does **not** carry over, and that
  this is not a license to skip the auth boundary. Two open items recorded rather than
  guessed: what an equity vs. debt position holds, and whether a public page marketing a
  private fund is constrained by securities-marketing rules (counsel question, gates the
  public surface only). `design/README.md` notes the folder covers the portfolio monitor but
  not the marketing surface. `main` established as the base branch.

- **Repo scaffolded from theAPlink: design + working-memory structure** (2026-08-23).
  `design/` copied byte-for-byte (11 files, verified by checksum) with only `README.md`
  rewritten — theAPlink's version asserts a mirror gate (`npm run lint:design`) and app
  paths that don't exist here, and an unenforced rule described as enforced is worse than an
  acknowledged convention. `.claudet/` created as structure only: the file set, the
  conventions, and the READMEs that explain them, with none of theAPlink's accumulated
  content. `.gitignore` carried, less its one theAPlink-specific entry. No app code, no
  configs, no CI.
