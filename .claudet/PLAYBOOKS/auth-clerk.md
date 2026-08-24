# PLAYBOOK — authentication (Clerk)

How the auth boundary works, how to bring it up, and what has already bitten someone.

Subsystem status: **code complete, not yet live.** Every code-side piece is built and
verified. Bringing it up needs four things only a person with the Clerk Dashboard can do —
see § Bring-up. Until those are done the private surface refuses everyone, by design.

---

## 1. How it works — two layers, on purpose

Authentication and authorization are separate here, and conflating them is the mistake this
design exists to prevent.

| Layer | File | Question it answers | Failure mode it closes |
|---|---|---|---|
| Authentication | `src/proxy.ts` | Is *somebody* signed in? | Anonymous internet traffic |
| Authorization | `src/lib/auth.ts` + `src/app/(private)/layout.tsx` | Is the signed-in person one of *ours*? | A stranger who signed themselves up |

**Why the second layer exists.** Clerk answers only the first question. Whether a stranger
can create an account is a **setting in the Clerk Dashboard** — not a fact anybody can
verify by reading this repo. Code that treats "signed in" as "allowed in" is therefore only
as closed as a checkbox no reviewer here can see. `.claudet/DECISIONS.md` is explicit that
two users is an argument against tenancy machinery and *never* against an auth boundary;
`SAVOY_ALLOWED_EMAILS` is what makes "two users" true in code rather than in a dashboard.

**Route protection is deny-by-default.** `src/proxy.ts` holds an exhaustive list of PUBLIC
routes; everything else requires a session. The inverse — list the private routes, leave
the rest open — fails in the dangerous direction, because a new page under the monitor
would ship public until someone remembered it.

**The private surface is a route group.** Everything under `src/app/(private)/` renders
through `(private)/layout.tsx`, which runs the allowlist check once. A new private page
inherits the check by being put in the group — it cannot be forgotten on a per-page basis.
`(private)` is a Next.js route group, so it does **not** appear in the URL: the page at
`src/app/(private)/monitor/page.tsx` serves `/monitor`.

**Refusals are rendered, not redirected.** A signed-in but unauthorized person gets a page
explaining which of the two failures happened, with a sign-out button. Redirecting them to
sign-in instead would loop: they *are* signed in.

---

## 2. Bring-up — the four steps only a person can do

Nothing below can be done from this repo. Until all four are complete, `/monitor` correctly
refuses everyone, including the principals.

1. **Create the Clerk application** and copy its API keys (Dashboard → API keys).
2. **Restrict sign-up to invitation only.** Dashboard → Configure → **Restrictions** → set
   sign-up mode to **Restricted**. Clerk's default allows anyone to create an account. The
   allowlist in step 4 means an uninvited account still sees nothing, so this is
   defence-in-depth rather than the only lock — but leaving open sign-up on is a standing
   invitation to fill the user list with strangers.
3. **Invite Rodney and Jett** (Dashboard → Users → Invite). There is deliberately no
   `/sign-up` route in this app; see GOTCHA 4.
4. **Set the environment variables** on the Railway service *and* in local `.env.local`.
   `.env.example` documents all three. `SAVOY_ALLOWED_EMAILS` must contain the same
   addresses the invitations went to.
5. **For a production instance (`pk_live_`), add Clerk's DNS records** on
   `savoycapital.io` — and set them **DNS only** if the zone is on Cloudflare. See
   GOTCHA 8; getting this wrong is silent until someone tries to sign in.

Then, if the owner wants the login reachable from the public site, flip the nav link in
`src/app/page.tsx` from `/coming-soon` to `/sign-in`. **That is an owner call, not a
cleanup task** — it is what makes the login publicly discoverable, and it was left pointing
at `/coming-soon` deliberately.

### Verifying bring-up worked

- Signed out, `/monitor` → 307 to `/sign-in?redirect_url=...` **on this domain**. A redirect
  to a `*.accounts.dev` host means GOTCHA 1 has regressed.
- Signed in as an allowlisted user → the monitor shell renders with the user's name.
- Signed in as anyone else → the red "cannot open" refusal, not the monitor.
- With `SAVOY_ALLOWED_EMAILS` unset → the amber "not configured" refusal, for everyone.

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

**GOTCHA 3 — an unset allowlist locks out the owners.**
*Symptom:* an invited, correctly signed-in principal sees "not configured yet".
*Cause:* `SAVOY_ALLOWED_EMAILS` is unset or empty on that deployment.
*Fix:* set it. It is **fail-closed on purpose**: reading "unset" as "let any signed-in user
through" would turn one forgotten deploy variable into an open door onto the fund's
positions. The two failures are not equally bad, so the code picks the recoverable one and
the refusal page names the variable.

**GOTCHA 4 — there is no sign-up route, and adding one is a decision.**
*Symptom:* someone looks for `/sign-up` and finds nothing.
*Cause:* deliberate. The authenticated population is two named people, provisioned by
invitation. `<ClerkProvider>` is configured without `signUpUrl` to match.
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

---

## 4. Deliberately not built

- **A `/sign-up` route** — GOTCHA 4.
- **Organizations / roles / permissions.** Clerk has them; two people with identical access
  do not need them. Revisit only if a third kind of user appears.
- **Webhooks (`/api/webhooks/clerk`).** There is no local user table to sync into — no
  Prisma schema exists yet. Build this when there is something to keep in sync, not before.
- **Tests.** The repo has no test framework. The allowlist decision logic *was* verified
  during setup with a throwaway harness (12 cases: fail-closed on unset/empty/whitespace
  allowlists, unverified addresses rejected, case and whitespace tolerance, secondary
  verified addresses accepted, and a lookalike domain rejected). That verification is not
  committed and therefore does not re-run. **`src/lib/auth.ts` is the first thing that
  should get a real test when a framework lands** — it is the only code here where a silent
  regression is a data-exposure bug rather than a visual one.
