# STATE — savoycapital

**A short, hand-written note on what is genuinely mid-flight or blocked on a person.** No
inventories, no counts — those rot between the audits that were supposed to refresh them
(theAPlink's `.claudet/scoping/archive/working-memory-redesign.md` is the record of
learning that). Keep this to a paragraph. Edit it only when the answer actually changes.

## Now

**The document store is live in code, management-only** (owner, 2026-08-24). Cloudflare R2
behind `/api/files` — list, upload, download, delete — with bytes streamed through
authenticated route handlers rather than presigned URLs, so the bucket needs no CORS policy
and nothing outlives a request. **No UI**: these are API routes, and a screen to drive them
is UI scope needing the owner's go-ahead.

**The part that is not code and cannot be checked by code:** the bucket's privacy is its
**Public Development URL** and **Custom Domain** both being off. Either one enabled makes
every object world-readable at a guessable URL, and nothing here will notice — the same shape
as the sign-up-mode risk, one layer down. `PLAYBOOKS/storage-r2.md` GOTCHA 1.

**Investor access is deliberately not built and is blocked on a person.** "Files for investors
and management" collides with the model this app rests on: `src/proxy.ts` asks only whether
somebody is signed in. Under that model an investor with a Clerk account reaches
`/portal/portfolio` — fund size, every position, every amount. The owner chose management-only
for now; `PREFIX.investors` is reserved and unread so the eventual authorization layer does
not have to rewrite existing keys.

**The design system has an owner now.** The design seat is commissioned (owner, 2026-08-24) —
palette and pattern fidelity across both surfaces, the `design/` folder itself, and the gate.
Charter in `AGENTS/DESIGN.md`, law in `.claude/rules/ui-governance.md`. **`npm run verify` is
now typecheck + eslint + `lint:design`**, so design drift fails CI instead of being noticed
by a person. Baseline `{}` on every rule; the mirror gate has no baseline at all.

**The first full audit is done and everything it found is fixed** (owner, 2026-08-24: "Fix
everything"). The app is clean on all twelve mechanical rules, and the residue the audit
raised has been worked rather than parked: the `C.green` collision is resolved by a standing
rule (**a badge's tone encodes state, never category**), both cards ship at radius 12, the
"% DEPLOYED" badge at 4, the carousel dots and `SiteNav`'s action meet the 44px floor on touch
with **desktop byte-identical**, the public display scale lives in `src/components/type.ts`
instead of duplicated literals, and the mobile drawer closes on Esc and returns focus.

**Two of those turned into rules** — `radius-scale` and `inline-svg` — so the gate is twelve
rules deep. **One deliberately did not:** there is no `spacing-scale` rule, because
`DESIGN_SYSTEM.md` § 3's own primitives use padding off its § 2 scale. The nine "off-scale
spacing violations" the first pass reported were not violations. Don't re-raise them.

**`design/`'s three self-contradictions are resolved** toward `DESIGN_SYSTEM.md` —
`AP_DESIGN_REFERENCE.md` carries a banner and `design/README.md` three new table rows. That
file is **READ FIRST** and was wrong here on three counts; read its banner before trusting a
rule in it.

**Still open, and named as gaps rather than oversights:** no `lint:mobile`, no focus trap on
the drawer (mobile seat's, needs a sentinel pair and a scroll lock), and no `tap-target` rule
because a hit area is not computable from a regex.

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
theAPlink's numbers, not ours; mobile here is **unmeasured** — not "zero".

**Those two docs are now amended to say all of that themselves** (owner, 2026-08-24). Each
carries a divergence banner, `design/README.md`'s table names every change, and `DECISIONS.md`
records the reasoning. `DESIGN_SYSTEM.md` won each conflict — mobile-first, a 44px floor
written per component, and more than one breakpoint allowed when derived — because the code
had already resolved them that way. **`design/` is now three-tenths divergent from theAPlink
rather than one-tenth**; that cost is recorded and accepted. **Anyone building the missing
machinery — a `useIsMobile()` hook, `mobile-cards.tsx`, a `@media (max-width:767px)` block, a
mobile lint — falsifies a row in those banners and must update them in the same PR.**

**Mobile has been measured for the first time (2026-08-24).** Every page rendered in Chromium
at 320–767px: 4 of 4 horizontally clean, one element bursting its container fixed
(`FundAllocation`'s legend column, which demanded 280px inside a 242px card at 320px and had
**zero** slack at 360px), and sub-44px controls down from 5 to 2. `MOBILE_REFERENCE.md` § 9
carries the numbers and § 9a the method — including the two traps that made the first run of
this sweep report a false clean: the sandbox proxy intercepting `localhost` so the browser
measured the proxy's error page, and the fact that an unstyled page never overflows, so
"clean" and "broken measurement" are indistinguishable without asserting the stylesheet
applied.

**The two remaining sub-floor controls are the owner's call, not the seat's:** the carousel
arrows at 36×36 (inside the § 9 carve-out, legitimately) and the carousel dots at 24×44 — a
deliberate earlier fix up from 6px that clears WCAG 2.2 AA but not the house floor on width.
Closing it visibly spreads the dot row, which is a design decision.

**To run the app locally you need Clerk keys from the owner — the fix is keys, not code.**
Without them every route 500s, `/api/health` included. Root cause confirmed by stack trace
(2026-08-24): the thrower is **`src/proxy.ts`**, not `<ClerkProvider>` — `clerkMiddleware`
calls `assertKey` inside `DevServer.runMiddleware`, ahead of any handler, which is why a
route with no layout above it dies too. Worth stating because the plausible-sounding
diagnosis (the provider wraps the root layout, so it takes everything down) does not explain
`/api/health` and is wrong here.

**Gating Clerk on key-presence to boot without them was considered and declined (owner,
2026-08-24).** It would make `next dev` serve `/portal/portfolio` — real fund figures —
unauthenticated. Fail-closed is worth more than local convenience. Do not re-propose it
without reading `PLAYBOOKS/auth-clerk.md`.

**With keys, local and production agree route-for-route** (both swept 2026-08-24): public
four at 200, every `/portal/**` and `/api/files/**` path at 307 to an on-domain `/sign-in`
with a relative `redirect_url`, unknown paths 307 too (deny-by-default). **The signed-in
landing is still unverified by anything automated** — it needs an SMS code to a real handset.

**The site is live on Railway** (owner-confirmed 2026-08-23). Next.js 16 + React 19 +
TypeScript + Tailwind (layout only), the public landing page at `/`, and a dependency-free
healthcheck at `/api/health`. Deploy shape: Nixpacks, `npm run build`, `npm run start`,
healthcheck on `/api/health`, Node pinned to 22 via `.nvmrc`. `npm run verify` (typecheck +
eslint + design-lint) and `npm run build` pass clean.

The public site is deliberately minimal: a nav, the **Our Portfolio** carousel (HTeaO
Franchisee, Westfield Fluid Controls, Marucci Sports — in that order) and nothing else. The
instrument cards and the footer were cut by the owner "until we get more formal." The nav's
one action is **"Investor Portal" → `/portal`**, which is protected, so a signed-out visitor
is 307'd to `/sign-in`; `/coming-soon` is still a public route with nothing linking to it.
**The first slide is a credit position in HTeaO's largest
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
route (two users, created in the Dashboard; owner reaffirmed "no sign up needed"
2026-08-24 — `/sign-up` 307s to `/sign-in` like any unknown path, verified), Clerk webhooks
(nothing to sync into yet), and
a test runner. `prisma/` and `docs/` are still empty by intent. **`.github/workflows` and
`scripts/` are not** — CI landed in #15, and `scripts/` now holds `design-lint.mjs`.

**Blocked on a person:** what an equity vs. debt position holds — the decision the portfolio
monitor's schema is built on. And the securities-marketing question in `FACTS.md`, which
gates what the *public* page may say, not whether it may exist.

**Clerk instance is live and its DNS is still half-fixed.** Production instance
`ins_3IL2OO8W1HTVwmTMHtleVAjH2AV` on `clerk.savoycapital.io`, keys set on Railway (owner,
2026-08-24). The instance id came from the Dashboard and is **not exposed on the public
environment endpoint**, so this seat cannot re-verify it from here — do not burn time trying.

`clerk.` serves real Clerk JSON (re-verified 2026-08-24). **`accounts.` is still proxied**:
it returns **HTTP 403 with Cloudflare's "Just a moment..." challenge page** — re-checked
2026-08-24, still outstanding. Note the symptom differs from GOTCHA 8's recorded one (Error
1000 / "DNS points to prohibited IP"); same root cause, different Cloudflare response, so
match on *"Cloudflare HTML instead of Clerk JSON"* rather than on the exact error. It should
be **DNS only**. This has not blocked sign-in — the app never routes anyone to the hosted
Account Portal, because `src/proxy.ts` passes an explicit `unauthenticatedUrl` (GOTCHA 1) —
but Clerk's own `display_config.sign_in_url` still points at
`https://accounts.savoycapital.io/sign-in`, so anything that follows Clerk's hosted URLs
would hit the challenge.

Sign-up mode is **`restricted`** (owner, 2026-08-24, verified against the live instance) —
it was `public` on first setup, which would have let anyone create an account.

**Accounts exist and the round trip works — this is no longer blocked.** The owner signed in
and used the portal on 2026-08-24 (sign-out redirected to the public page, and a deep link
to a portal route reached `/sign-in`). Creating the account IS the authorization step; there
is no list to add anyone to. **Still outstanding on the Dashboard:** flip the `accounts.`
DNS record to DNS-only (above).

**What no automated check covers, and why:** signing in needs an SMS code to a real handset,
so the *landing* after sign-in is owner-verified only. Everything anonymous — the route
sweep, the redirect target, `sign_up.mode` — this seat verifies directly and did, last on
2026-08-24 after `#28`.

**The public nav is NOT outstanding, and this file said twice that it was.** It renders
"Investor Portal" → `/portal`; `/portal` is protected, so the login is already discoverable
via the 307 to `/sign-in`. Pointing the nav straight at `/sign-in` would only skip that
redirect, and remains an owner call rather than a cleanup task.
