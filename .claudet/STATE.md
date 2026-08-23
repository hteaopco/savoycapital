# STATE — savoycapital

**A short, hand-written note on what is genuinely mid-flight or blocked on a person.** No
inventories, no counts — those rot between the audits that were supposed to refresh them
(theAPlink's `.claudet/scoping/archive/working-memory-redesign.md` is the record of
learning that). Keep this to a paragraph. Edit it only when the answer actually changes.

## Now

**The site is live on Railway** (owner-confirmed 2026-08-23). Next.js 16 + React 19 +
TypeScript + Tailwind (layout only), the public landing page at `/`, and a dependency-free
healthcheck at `/api/health`. Deploy shape: Nixpacks, `npm run build`, `npm run start`,
healthcheck on `/api/health`, Node pinned to 22 via `.nvmrc`. `npm run verify` (typecheck +
lint) and `npm run build` pass clean.

The landing page is real code, not a mockup: "What we invest in" over a Recent Investments
carousel (Westfield Fluid Controls, HTeaO, Marucci). Its copy is **drafted, not approved** —
every `[BRACKETED]` value is a fact nobody has supplied, and the write-ups are `[TBD]` by
the owner's instruction.

**Deliberately still absent:** Prisma (no schema yet, so no client to generate), Clerk, any
authenticated surface, tests, and CI. `prisma/`, `scripts/`, `docs/`, `.github/workflows`
and `src/lib` are still empty by intent.

**Blocked on a person:** what an equity vs. debt position holds — the decision the portfolio
monitor's schema is built on. And the securities-marketing question in `FACTS.md`, which
gates what the *public* page may say, not whether it may exist.
