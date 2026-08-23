# LOG — savoycapital

Reverse-chronological log of notable changes.

> **Note on this file's future.** theAPlink froze its LOG and now derives change history
> from git (`node scripts/changelog.mjs` — under squash-merge, one merged PR is one entry),
> because hand-appending made it a merge-conflict magnet and let it carry claims that were
> never true. This repo has no such script yet, so this file is hand-written for now. When
> the generator lands, freeze this file rather than keeping both.

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
