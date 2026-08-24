# PLAYBOOK — authentication (Clerk)

How the auth boundary works, how to bring it up, and what has already bitten someone.

Subsystem status: **live and verified in production (2026-08-24).** The instance
`clerk.savoycapital.io` serves, sign-up reads `restricted`, and every private route 307s to
an on-domain `/sign-in` with a relative `redirect_url`. Verified by route sweep against
`savoycapital.io` and against a local `next dev` with production keys — the two agree
route-for-route. **Still unverified by anything automated: the signed-in landing.** It needs
an SMS code to a real handset, so no check here completes the round trip.

---

## 1. How it works — one boundary, and where it actually lives

**The boundary is the Clerk instance's sign-up mode, not code in this repo.**

`sign_up.mode` is set to **`restricted`**, so a Clerk account cannot come into existence
unless one of the principals made it. On that instance "signed in" and "allowed in" are
the same statement, which is why `src/proxy.ts` — which only asks whether *somebody* is
signed in — is sufficient on its own.

**Accounts are created directly in the Dashboard, not invited (owner, 2026-08-24).** This
does not move the boundary and the distinction is worth being precise about, because the
earlier wording here said "invited" and would now read as false. The property that matters
is whether a *stranger* can cause an account to exist; `restricted` answers no, and it does
not care which admin gesture created the account. Invitation and direct creation are
equivalent under it.

**What is NOT equivalent: setting `sign_up.mode` back to `public` to make account creation
easier.** Direct creation works fine under `restricted`. Flipping the mode is the one change
that opens the door, and it is silent — GOTCHA 3.

| Layer | File | Question it answers |
|---|---|---|
| Authentication | `src/proxy.ts` | Is somebody signed in? |
| Authorization | *(none — see below)* | Answered by the invitation, in Clerk |

**Route protection is deny-by-default.** `src/proxy.ts` holds an exhaustive list of PUBLIC
routes; everything else requires a session. The inverse — list the private routes, leave the
rest open — fails in the dangerous direction, because a new page under the monitor would ship
public until someone remembered it.

**The private surface is the whole `/portal` section**, not a single page. `/portal`
itself (`src/app/portal/page.tsx`) is a redirect; the fund allocation and its position-level
amounts live at `/portal/portfolio` (`src/app/portal/portfolio/page.tsx`), and
`/portal/historical` is an empty shell waiting on the position schema. Each is protected by
being **absent from the public list above**, not by anything on the page itself. There is no
marker in any of those files that makes them private, which is the deny-by-default trade:
adding a route is safe, and adding one to the public list is the dangerous edit. Review
changes to that list the way you would review a change to a permission.

### What was removed, and the risk that came with it

An earlier revision carried a second lock — an env-var allowlist of the people permitted to
open the monitor — because at first setup this instance had `sign_up.mode: "public"` and a
stranger could have created their own account. Restricting sign-up removed that reason, and
the owner dropped the allowlist (2026-08-24) rather than keep user identities in deploy
config, where adding a person meant a redeploy.

**The cost, stated plainly: if sign-up is ever set back to `public`, the portfolio monitor
opens to anyone who signs up, and nothing in this repo will detect it.** There is no code
path that reads the instance's sign-up mode. That setting IS the access control now, so
treat changing it as a change to the security boundary rather than a Dashboard preference.
GOTCHA 3 is how to check it.

---

## 2. Bring-up — the four steps only a person can do

Nothing below can be done from this repo. Until all four are complete, `/monitor` correctly
refuses everyone, including the principals.

1. **Create the Clerk application** and copy its API keys (Dashboard → API keys).
2. **Restrict sign-up to invitation only.** Dashboard → Configure → **Restrictions** → set
   sign-up mode to **Restricted**. Clerk's default allows anyone to create an account.
   **This is the entire access boundary** — there is no second lock behind it. Done
   2026-08-24; GOTCHA 3 says how to confirm it is still true.
3. **Create Rodney's and Jett's accounts** (Dashboard → Users → Create user). Phone number
   and name; **no password** — the instance has passwords disabled outright, so sign-in is
   an SMS code and there is nothing to set. There is deliberately no `/sign-up` route in
   this app; see GOTCHA 4. **Creating the account IS the authorization** — there is no
   second list to add them to. (Invitations also work and were the original plan; the owner
   moved to direct creation on 2026-08-24 for a two-person site. See § 1 — the boundary is
   the same either way.)
4. **Set the environment variables** on the Railway service *and* in local `.env.local`.
   `.env.example` documents both keys. There is no allowlist variable.
5. **For a production instance (`pk_live_`), add Clerk's DNS records** on
   `savoycapital.io` — and set them **DNS only** if the zone is on Cloudflare. See
   GOTCHA 8; getting this wrong is silent until someone tries to sign in.

The login is **already** reachable from the public site, so this is not an outstanding
bring-up step. `src/app/page.tsx` renders `<SiteNav action={{ href: "/portal", label:
"Investor Portal" }} />`, and because `/portal` is protected a signed-out visitor who clicks
it is 307'd to `/sign-in`. Pointing the nav straight at `/sign-in` would only skip that one
redirect; doing so is an owner call, not a cleanup task. `/coming-soon` is still a public
route, but nothing links to it any more.

### Verifying bring-up worked

- Signed out, `/portal` → 307 to `/sign-in?redirect_url=...` **on this domain**. A redirect
  to a `*.accounts.dev` host means GOTCHA 1 has regressed. Check `/portal/portfolio` and
  `/portal/historical` too: each is protected on its own, not by the section prefix.
- Signed in as an invited user → `/portal` redirects to `/portal/portfolio`, which renders
  the allocation. Sign-out is in **`PortalShell`'s own account block at the foot of the
  sidebar** — not Clerk's `<UserButton />`, which the owner replaced on 2026-08-24. The
  portal does not render `SiteNav` at all.
- The instance still reports `"mode": "restricted"` (GOTCHA 3).

---

## 3. GOTCHAS

**GOTCHA 1 — Clerk redirects to its own hosted portal unless you stop it.**
*Symptom:* signed-out visitor to a protected route lands on
`https://<instance>.accounts.dev/sign-in` — a third-party domain, unstyled, and
`src/app/sign-in/` is silently dead code.
*Cause:* the `signInUrl` prop on `<ClerkProvider>` steers Clerk's *client* components. It
does not reach the middleware, which falls back to Clerk's Account Portal.
*Fix (in place):* `src/proxy.ts` passes an explicit `unauthenticatedUrl` to
`auth.protect()`. **Do not remove it.** This was observed, not theorised — the first
smoke test redirected off-domain.
*Note:* the documented alternative is the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` env var. It was
not used, because then a forgotten deploy variable silently restores the broken behaviour;
in code, it cannot.

**GOTCHA 2 — a new public page will ask visitors to log in.**
*Symptom:* a marketing page 307s to `/sign-in`.
*Cause:* deny-by-default. It is not on the `isPublicRoute` list in `src/proxy.ts`.
*Fix:* add it there. This is the intended failure direction — loud and harmless — and the
same rule means a mistyped URL redirects to sign-in rather than 404ing. That wart is the
accepted cost of not leaking the private surface.

**GOTCHA 3 — sign-up mode IS the access control; verify it, do not assume it.**
*Symptom:* none, ever, until a stranger is looking at the fund's positions. This failure is
completely silent by construction.
*Cause:* with the allowlist removed, anyone who can create a Clerk account can open
`/portal`. If `sign_up.mode` returns to `public` — someone testing, a Clerk default
changing, a new instance — the door is open and no code here notices.
*Check it* (no credentials needed, the environment endpoint is public):
```
curl -s "https://clerk.savoycapital.io/v1/environment?__clerk_api_version=2025-04-10&_clerk_js_version=5.0.0" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['user_settings']['sign_up']['mode'])"
```
Expect `restricted`. Anything else means `/portal` — fund size and position-level
amounts — is readable by anyone who signs up.
*Fix:* Dashboard → Configure → Restrictions → Restricted.

**GOTCHA 4 — there is no sign-up route, and adding one is a decision.**
*Symptom:* someone looks for `/sign-up` and finds nothing.
*Cause:* deliberate. The authenticated population is two named people, provisioned by the
owner in the Clerk Dashboard. `<ClerkProvider>` is configured without `signUpUrl` to match.
*Fix:* none needed. Adding self-service sign-up to a private fund's portfolio monitor is an
owner decision, not a gap to fill.

**GOTCHA 5 — the file is `src/proxy.ts`, not `src/middleware.ts`.**
*Symptom:* you go looking for `middleware.ts` and conclude auth is not wired up.
*Cause:* Next.js 16.3 deprecated the `middleware` file convention in favour of `proxy`, and
warns on every build if you use the old name. Clerk's own docs still say `middleware.ts`;
`clerkMiddleware` works unchanged under the new name — verified by the smoke test, not
assumed.
*Fix:* none. Do not rename it back to silence a doc mismatch.

**GOTCHA 6 — `/api/health` must stay public.**
*Symptom:* Railway healthcheck fails and the deploy is rolled back, with the app itself
fine.
*Cause:* the healthcheck is unauthenticated; protecting the route 307s it.
*Fix:* keep `/api/health` on the public list. `railway.json` points at it.

**GOTCHA 7 — the build succeeds without Clerk keys; the app does not run without them.**
*Symptom:* CI/Railway build goes green, the deploy then fails or every page errors.
*Cause:* `next build` does not need the keys (verified — the build was run with them
unset). The running server does.
*Fix:* set both keys before deploying. This is a feature, not a bug: it means a missing key
cannot be papered over at build time with a fake value.

**GOTCHA 8 — Clerk's DNS records must be "DNS only" in Cloudflare, never proxied.**
*Symptom:* `https://clerk.savoycapital.io` returns a Cloudflare HTML page titled
**"DNS points to prohibited IP" (Cloudflare Error 1000)** instead of Clerk's JSON. Sign-in
fails completely; the app looks fine and the apex domain serves normally, which makes this
easy to misread as a Clerk outage.
*Cause:* the CNAME was created with Cloudflare's **proxy enabled (orange cloud)**. Clerk's
frontend API already sits behind Cloudflare, so proxying it a second time is refused.
*Fix:* in Cloudflare DNS, set every Clerk record — `clerk`, `accounts`, `clkmail` and both
`clk*._domainkey` records — to **DNS only (grey cloud)**. The apex/`www` records for the app
itself are unaffected and may stay proxied.
*Observed 2026-08-24* on `clerk.` and `accounts.` — this is not theoretical, it is what the
first production DNS attempt produced.

**GOTCHA 9 — this instance identifies users by PHONE, not email.**
*Symptom:* code or docs that reach for `user.emailAddresses` find nothing, and any check
built on a verified email rejects everyone including the principals.
*Cause:* the instance is configured phone-first —
`identification_strategies: ["phone_number"]`, `email_address: off`,
`email_address_verification_strategies: []`. Read from the live instance, 2026-08-24.
*Consequence:* `firstName` is the only reliable display value; there is no email to greet
someone by or to key anything on. An earlier allowlist keyed on email had to be rewritten for
phones before being dropped entirely — the identifier is not a detail, so check it before
building anything that depends on one.

*And there is no password.* Read from the same response, 2026-08-24:
`password.enabled: false`, `first_factors: ["phone_code", "ticket"]`,
`second_factors: ["phone_code"]`, `first_name`/`last_name` enabled but not required.
**An SMS code is the only way in**, which is why creating an account needs nothing but a
phone number and a name. Two things follow that are easy to get wrong:
- **Do not build anything that assumes a password exists** — no "change password" affordance,
  no password-strength copy, no `password` field in a user-creation flow.
- **Turning on Clerk's 2FA buys nothing today.** The only second factor available is
  `phone_code` — the same channel as the first — so it would ask for a second code from the
  same handset. A real second factor means enabling `authenticator_app`, which is a Dashboard
  change and an owner call. Accepted as-is (DECISIONS, 2026-08-24).

**GOTCHA 11 — `request.url` is the INTERNAL address behind Railway.**
*Symptom:* sign-in works, and then dumps the user at
`https://localhost:8080/portfolio`. Invisible locally, where internal and public origins are
the same thing; only reproduces on a deployed host.
*Cause:* Railway terminates TLS and forwards to the container, so in the proxy
`request.url` is `https://localhost:8080/...`. The redirect's own `Location` header survives
this — Next rebuilds its host from the forwarded headers — but a URL you put in a **query
string** is opaque to that rewriting and ships the internal origin verbatim.
*Fix (in place):* `src/proxy.ts` sets `redirect_url` to a **relative** path
(`${request.nextUrl.pathname}${request.nextUrl.search}`). Nothing has to reconstruct the
public origin, so nothing can get it wrong.
*Why not `X-Forwarded-Host`:* it is the other fix and it works, but that header is
attacker-controlled unless the proxy is known to overwrite it, and feeding it into a redirect
target is how open redirects are built. A relative path has no such surface.
*General rule:* never put `request.url` into anything that survives past the redirect.
Observed in production 2026-08-24, minutes after the first deploy.

**GOTCHA 12 — renaming the private route needs `signInFallbackRedirectUrl` moved with it.**
*Symptom:* sign-in succeeds and lands the user on a 404. The boundary is fine; the
destination is not.
*Cause:* `signInFallbackRedirectUrl` lives on `<ClerkProvider>` in `src/app/layout.tsx` —
nowhere near the route folder, so a rename that moves the page and updates the nav link
still misses it.
*What the rename does NOT need:* any change to `src/proxy.ts`. Protection is deny-by-default,
so the new path is closed the moment it exists and the old one stops mattering. This is the
payoff for enumerating public routes rather than private ones — under the inverse design the
renamed route would ship **public** until someone remembered it.
*Checklist for renaming the private route:* move the folder; `signInFallbackRedirectUrl` in
`src/app/layout.tsx`; the `SiteNav` href in `src/app/page.tsx`; this playbook and `STATE.md`.
Then verify on the deployed host that the new path 307s and that signing in lands somewhere
real. `/portfolio` -> `/portal`, 2026-08-24.

**GOTCHA 13 — `createRouteMatcher` is deprecated and goes away in `@clerk/nextjs` v8.**
*Symptom:* a deprecation warning on every dev boot, and eventually a hard break on a major
bump. Nothing is wrong today.
*Cause:* Clerk is moving away from middleware path-matching toward resource-based checks
"in each page, layout, API route, or Server Function that accesses protected data." Their
stated reason is worth reading carefully rather than dismissing: **path matching can diverge
from how Next.js routes requests and leave protected resources reachable.** That is a claim
about this repo's entire boundary mechanism.
*Status:* **no action this cycle (owner, 2026-08-24 — "default to you").** We are pinned
`^7.8.0`, the mechanism is verified working by route sweep against production, and migrating
now would rewrite the boundary for no present gain.
*What to do at the v8 bump:* treat it as boundary work, not a dependency bump. The pattern
`/api/files/**` already uses — proxy protection **plus** an `auth()` assertion inside each
handler — is what the resource-based model looks like, so that pair is the migration target
for every private route, and it is defense-in-depth worth having regardless.
*Do not* silence the warning by pinning older, or by reaching for a deprecated shim.

**GOTCHA 14 — "I can still click around the portal" is NOT evidence the session survived.**
*Symptom:* a user clicks Sign Out, is not redirected, and keeps navigating the portal. Reads
exactly like a broken session boundary. Reported by the owner, 2026-08-24.
*Cause — the part that is structural and permanent:* **every portal route is statically
prerendered.** `next build` reports `○` for `/portal`, `/portal/portfolio`,
`/portal/historical`, `/home` and `/deal-room`; only `/sign-in` and the API routes are `ƒ`.
The sidebar's `next/link` entries prefetch those routes into the browser's router cache, so
moving between them is a client-side swap that **never reaches the server** — which means
`src/proxy.ts` never runs and cannot 307 anyone out mid-session. Cached pages keep rendering
until the tab does a real request. This is inherent to static prerendering plus prefetch, not
a bug to fix, and it does **not** expose anything to a different person or a different device.
*Cause — the part that was situational:* Railway auto-deploys on every merge to `main` and
several seats merge daily, so a tab held open across a deploy references chunk hashes the
server no longer has. A client in that state can have dead handlers — including Sign Out —
while still rendering fine from cache. **Inferred, not observed**: the owner's later attempt
from a fresh load signed out correctly and a deep link 307'd, which fits, but nobody captured
the failing client.
*The check that actually distinguishes the two states, and it takes five seconds:* **hard-
reload the private route, or open it in a fresh tab.**
- 307 to `/sign-in` → the session is gone; what was seen was cache, and the boundary is fine.
- The portal renders → the session is genuinely alive and sign-out failed. That one is real.
*The rule worth carrying:* this seat's standing principle is that a check which cannot fail
proves nothing. Client-side navigation is exactly such a check — it succeeds whether or not a
session exists. **Judge the boundary only on a fresh request.** Verified 2026-08-24: signed
out, a deep link to `/deal-room` returned 307 and the full anonymous route sweep was clean.

---

## 4. Deliberately not built

- **A `/sign-up` route** — GOTCHA 4.
- **Organizations / roles / permissions.** Clerk has them; two people with identical access
  do not need them. Revisit only if a third kind of user appears — that is also the point at
  which "everyone invited sees everything" stops being an acceptable model.
- **An in-app allowlist.** Removed 2026-08-24; see § 1. If one ever comes back, put it in
  Clerk `privateMetadata` rather than an env var, so adding a person is not a redeploy.
- **Webhooks (`/api/webhooks/clerk`).** There is no local user table to sync into — no
  Prisma schema exists yet. Build this when there is something to keep in sync, not before.
- **Tests.** The repo has no test framework. The allowlist decision logic *was* verified
  during setup with a throwaway harness (16 cases: fail-closed on unset/empty/punctuation-only
  allowlists, unverified numbers rejected, human formatting tolerated on both sides, secondary
  verified numbers accepted, missing country codes refused with a hint, and prefix/suffix
  near-miss numbers rejected). That verification is not committed and therefore does not
  re-run. **`src/lib/auth.ts` is the first thing that
  should get a real test when a framework lands** — it is the only code here where a silent
  regression is a data-exposure bug rather than a visual one.
