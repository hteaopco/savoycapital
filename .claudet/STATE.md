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

The public site is deliberately minimal: a nav, the **Our Portfolio** carousel (Westfield
Fluid Controls, HTeaO, Marucci) and nothing else. The instrument cards and the footer were
cut by the owner "until we get more formal." Investor login goes to `/coming-soon`.
All three slides carry the owner's real copy — write-up, instrument, year, "Current" status
and a company link — so **no `[BRACKETED]` placeholder remains on the public page.**
**The page carries no securities disclosure** — the placeholder went with the footer, and
real language has to land before anyone is pointed at the site. That is now the last thing
standing between this page and being promotable.

**Deliberately still absent:** Prisma (no schema yet, so no client to generate), Clerk, any
authenticated surface, tests, and CI. `prisma/`, `scripts/`, `docs/`, `.github/workflows`
and `src/lib` are still empty by intent.

**Blocked on a person:** what an equity vs. debt position holds — the decision the portfolio
monitor's schema is built on. And the securities-marketing question in `FACTS.md`, which
gates what the *public* page may say, not whether it may exist.
