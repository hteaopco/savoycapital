# LOG — savoycapital

Reverse-chronological log of notable changes.

> **Note on this file's future.** theAPlink froze its LOG and now derives change history
> from git (`node scripts/changelog.mjs` — under squash-merge, one merged PR is one entry),
> because hand-appending made it a merge-conflict magnet and let it carry claims that were
> never true. This repo has no such script yet, so this file is hand-written for now. When
> the generator lands, freeze this file rather than keeping both.

- **Repo scaffolded from theAPlink: design + working-memory structure** (2026-08-23).
  `design/` copied byte-for-byte (11 files, verified by checksum) with only `README.md`
  rewritten — theAPlink's version asserts a mirror gate (`npm run lint:design`) and app
  paths that don't exist here, and an unenforced rule described as enforced is worse than an
  acknowledged convention. `.claudet/` created as structure only: the file set, the
  conventions, and the READMEs that explain them, with none of theAPlink's accumulated
  content. `.gitignore` carried, less its one theAPlink-specific entry. No app code, no
  configs, no CI.
