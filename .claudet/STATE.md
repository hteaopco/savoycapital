# STATE — savoycapital

**A short, hand-written note on what is genuinely mid-flight or blocked on a person.** No
inventories, no counts — those rot between the audits that were supposed to refresh them
(theAPlink's `.claudet/scoping/archive/working-memory-redesign.md` is the record of
learning that). Keep this to a paragraph. Edit it only when the answer actually changes.

## Now

The repo is **folder architecture and nothing else.** The directory skeleton is in place —
`.claude/{hooks,rules}`, `.github/workflows`, `docs`, `prisma/migrations`, `scripts`, and
`src/{app,app/api,components,content,lib}` — all empty, held by `.gitkeep`. **Deliberately
blank** (owner, 2026-08-23): no `package.json`, no configs, no schema, no code. `design/`
and this `.claudet/` are the only populated directories.

The product is now defined — a private investment fund's public landing page plus a
two-person portfolio monitor (`FACTS.md`). **What's still open before app scaffolding:** the
stack confirmation, the domain name, and what a portfolio position actually holds for equity
vs. debt. The securities-marketing question in `FACTS.md` gates the *public* surface
specifically, not the private one — the portfolio monitor can be built without waiting on it.

`main` is the base branch. Not connected to Railway yet.
