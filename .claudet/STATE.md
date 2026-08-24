# STATE — savoycapital

**A short, hand-written note on what is genuinely mid-flight or blocked on a person.** No
inventories, no counts — those rot between the audits that were supposed to refresh them
(theAPlink's `.claudet/scoping/archive/working-memory-redesign.md` is the record of
learning that). Keep this to a paragraph. Edit it only when the answer actually changes.

## Now

**Auth has an owner now.** The Clerk seat is commissioned (owner, 2026-08-24) — the instance,
`src/proxy.ts`, the sign-in surface, and the configuration and DNS behind them. **Not the
site**, which belongs to other seats. Charter in `AGENTS/CLERK.md`; if you are here to change
a feature, that agent is not your agent.

**Mobile has an owner now.** The mobile design seat is commissioned (owner, 2026-08-24) — how
every screen behaves at ≤767px, across both the public site and the portal. Charter in
`AGENTS/MOBILE.md`. Its § "What I inherited vs. what is true here" is the part to read before
trusting a mobile doc: **`design/MOBILE_REFERENCE.md` and `MOBILE_AUDIT_PLAYBOOK.md` are
carried from theAPlink and describe machinery this repo does not have** — no `lint:mobile`, no
`useIsMobile()`, no `mobile-cards.tsx`, and **no `@media (max-width:767px)` block in
`globals.css`, so nothing is auto-floored to a tap-target size.** Their coverage tables are
theAPlink's numbers, not ours; mobile here is **unmeasured**. Where the two inherited docs
disagree, `DESIGN_SYSTEM.md` wins (mobile-first, 44px floor, more than one breakpoint allowed)
— which is what the code already does. Not yet an owner-recorded decision.

**The site is live on Railway** (owner-confirmed 2026-08-23). Next.js 16 + React 19 +
TypeScript + Tailwind (layout only), the public landing page at `/`, and a dependency-free
healthcheck at `/api/health`. Deploy shape: Nixpacks, `npm run build`, `npm run start`,
healthcheck on `/api/health`, Node pinned to 22 via `.nvmrc`. `npm run verify` (typecheck +
lint) and `npm run build` pass clean.

The public site is deliberately minimal: a nav, the **Our Portfolio** carousel (HTeaO
Franchisee, Westfield Fluid Controls, Marucci Sports — in that order) and nothing else. The
instrument cards and the footer were cut by the owner "until we get more formal." Investor
login goes to `/coming-soon`. **The first slide is a credit position in HTeaO's largest
FRANCHISEE, not in HTeaO itself**, though it carries HTeaO's mark.
All three slides carry the owner's real copy — write-up, instrument, year, "Current" status
and a company link — so **no `[BRACKETED]` placeholder remains on the public page.** The
carousel crossfades every 6s, stops for good on any manual move, and renders all three slides
server-side.
**The page carries no securities disclosure** — the placeholder went with the footer, and
real language has to land before anyone is pointed at the site. That is now the last thing
standing between this page and being promotable.

**`design/` diverges from theAPlink on purpose, in one file.** `DESIGN_SYSTEM.md` carries two
owner-approved amendments (a 400ms content crossfade; a 36px floor for spaced secondary
controls). The other nine content files are byte-identical, verified. If you are diffing
`design/` against theAPlink, **that difference is expected — do not "restore" it.** The file's
own banner, `design/README.md`'s divergence table and `DECISIONS.md` all say so.

**Clerk is wired up.** `src/proxy.ts` protects everything except an enumerated public list,
`/sign-in` is styled to the palette, and **`/portal` — the fund allocation — is behind it**.
Production instance `ins_3IL2OO8W1HTVwmTMHtleVAjH2AV` on `clerk.savoycapital.io`, keys set on
Railway, `clerk.` DNS serving real Clerk JSON. `accounts.` still returns a Cloudflare
interstitial, consistent with that record still being proxied — it should be **DNS only**
(`PLAYBOOKS/auth-clerk.md` GOTCHA 8).

**The access boundary is Clerk's `sign_up.mode: "restricted"` — nothing in this repo.** The
earlier env-var allowlist was removed by the owner (2026-08-24) once sign-up was restricted;
DECISIONS carries why and what it costs. The short version: **if that setting ever returns to
`public`, `/portal` opens to anyone who signs up and no code here will notice.** GOTCHA 3 is
a one-line check worth running before anyone trusts the surface.

The instance identifies users **by phone**, not email — `firstName` is the only reliable
display value.

**The open-portfolio window is closed.** `/portal` shipped unauthenticated on 2026-08-23
(a deliberate owner call, recorded in that page's own header), linked from the public
homepage as "Investor login", serving fund size and position-level amounts to anyone with
the URL. Verified reachable at HTTP 200 before this change and 307-to-sign-in after it.

**Deliberately still absent:** Prisma (no schema yet, so no client to generate), a `/sign-up`
route (two users, invited from the Dashboard), Clerk webhooks (nothing to sync into yet),
tests, and CI. `prisma/`, `scripts/`, `docs/` and `.github/workflows` are still empty by
intent.

**Blocked on a person:** what an equity vs. debt position holds — the decision the portfolio
monitor's schema is built on. And the securities-marketing question in `FACTS.md`, which
gates what the *public* page may say, not whether it may exist.

**Clerk instance is live and its DNS is half-fixed.** Production instance
`ins_3IL2OO8W1HTVwmTMHtleVAjH2AV` on `clerk.savoycapital.io`, keys set on Railway (owner,
2026-08-24). `clerk.` now serves real Clerk JSON; `accounts.` still returns a Cloudflare
interstitial, consistent with that record still being proxied — it should be **DNS only**
(GOTCHA 8).

Sign-up mode is **`restricted`** (owner, 2026-08-24, verified against the live instance) —
it was `public` on first setup, which would have let anyone create an account.

**Blocked on the Clerk Dashboard** (`PLAYBOOKS/auth-clerk.md` § 2): invite Rodney and Jett.
That invitation is now the whole authorization step — there is no list to add them to. Also
still outstanding: flip the `accounts.` DNS record to DNS-only, and point the public nav's
"Investor login" at `/sign-in` when the owner wants it discoverable. `next build` passes without them, so the deploy will not break before they land —
but the monitor refuses everyone until they do. Separately, the public nav's "Investor
login" still points at `/coming-soon`; pointing it at `/sign-in` is a one-line owner call,
left alone on purpose.
