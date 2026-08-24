# DECISIONS — savoycapital

Record real, load-bearing decisions here: **what + why + date.** The bar is "someone would
otherwise re-litigate this" — not every choice, just the ones that cost something to
reopen. Read the headers before working in an area.

Newest first.

- **The in-app allowlist is removed; restricted sign-up is the whole boundary (owner,
  2026-08-24).** `SAVOY_ALLOWED_PHONES` and `src/lib/auth.ts` are deleted. The Clerk instance
  is set to `sign_up.mode: "restricted"`, so an account cannot exist unless a principal
  invited it, and on that instance "signed in" and "allowed in" are the same statement.
  `src/proxy.ts` enforcing the first therefore enforces both.
  - **This supersedes the three allowlist decisions below.** They are kept rather than deleted
    because the reasoning that produced them was correct *at the time*: the instance was
    `sign_up.mode: "public"` when the boundary was designed, and with open sign-up a session
    genuinely proved nothing. Restricting sign-up removed the premise, not the logic.
  - **Why it was dropped rather than kept as defence-in-depth.** An env-var allowlist puts
    user identity in deploy config: adding or revoking a person means a redeploy, and the
    list drifts from the invitations it is supposed to mirror. The owner judged the
    redundancy not worth that, which is a reasonable call for two people on a restricted
    instance.
  - **The cost, stated plainly: the security boundary now lives in a Dashboard toggle, and
    nothing in this repo can see it.** If `sign_up.mode` returns to `public` — someone
    testing, a new instance, a Clerk default changing — the portfolio monitor opens to anyone
    who signs up, silently. Treat that setting as code. `PLAYBOOKS/auth-clerk.md` GOTCHA 3
    carries a one-line check.
  - **If a second lock is ever wanted again, it goes in Clerk `privateMetadata`**, not an env
    var — same protection, no redeploy to add a person.

- **The allowlist matches phone numbers, not email addresses (owner, 2026-08-24).** The
  Clerk instance identifies users by phone — `identification_strategies: ["phone_number"]`,
  email off, no email verification strategies at all, read from the live instance rather than
  assumed. An email allowlist against that instance rejects **everyone**, principals included,
  because there is no verified email to match. `SAVOY_ALLOWED_PHONES` replaces
  `SAVOY_ALLOWED_EMAILS`.
  - **The identifier is the boundary, not a detail.** If the instance ever moves to email,
    `src/lib/auth.ts` moves with it. The two must not drift, and the failure when they do is
    silent — which is why `checkAccess` reports `no-verified-phone` separately from
    `not-allowlisted`: a configuration mismatch should never read as a permissions verdict.
  - **The cost, stated plainly.** A phone number is a weaker business identifier than an
    email: it changes with carriers and handsets, it is awkward to keep straight for two
    people, and it ties fund access to a SIM. Email was the recommendation for those reasons;
    phone is what the instance is built on and the owner chose to keep it.
  - **Country codes are required.** Comparison strips spaces, dashes, parens and `+`, but does
    not infer a country — a 10-digit entry would make the allowlist guess at identity. A
    likely-truncated entry raises an explicit hint instead of failing silently.

- **The private surface is gated by an explicit email allowlist, not by "is signed in"
  (2026-08-23).** `SAVOY_ALLOWED_EMAILS` names the people who may open the portfolio
  monitor; `src/lib/auth.ts` checks it server-side against the **verified** addresses on the
  Clerk account, and `src/app/(private)/layout.tsx` runs that check for every page in the
  group.
  - **Why "signed in" is not enough.** Clerk answers authentication only. Whether a stranger
    can create an account is a **setting in the Clerk Dashboard** — not a fact anyone can
    check by reading this repo — so an app that trusts the session alone is exactly as closed
    as a checkbox no reviewer here can see. This is the concrete form of the standing rule
    that two users is an argument against tenancy machinery and never against an auth
    boundary.
  - **It fails closed, and that cost is real.** An unset or empty allowlist admits nobody,
    the principals included. The alternative — treating "unset" as "any signed-in user" —
    converts one forgotten deploy variable into an open door onto the fund's positions. The
    two failure modes are not equally bad, so the code takes the recoverable one; the refusal
    page names the variable to set so the fix is a deploy setting, not a debugging session.
  - **Verified addresses only, and all of them** — not just the primary. Matching the primary
    alone locks out an owner who later adds and promotes an address; accepting unverified
    ones would let anyone claim an allowlisted address they do not control.

- **Route protection is deny-by-default: the PUBLIC routes are the list (2026-08-23).**
  `src/proxy.ts` enumerates `/`, `/coming-soon`, `/sign-in(.*)` and `/api/health`; everything
  else requires a session. The inverse — enumerate the private routes — fails in the
  dangerous direction, because a new page under the monitor ships public until someone
  remembers to add it.
  - **The cost, stated plainly:** an unknown or mistyped URL redirects a signed-out visitor
    to the login instead of 404ing, and a new marketing page will ask for a login until it is
    added to the list. Both are loud, harmless and instantly visible. Serving fund positions
    to the internet is none of those things.

- **There is no sign-up route, and the login is not linked from the public site yet
  (2026-08-23).** The authenticated population is two named people, provisioned by
  invitation from the Clerk Dashboard; `<ClerkProvider>` is configured without a `signUpUrl`
  to match. The public nav's "Investor login" still points at `/coming-soon`, not `/sign-in`.
  - **Why the link was left alone.** Pointing the public site at a live login is what makes
    it discoverable, and it should happen when the owner has invited the users and set the
    keys — not as a side effect of wiring the library up. It is a one-line change in
    `src/app/page.tsx` when they want it.

- **Clerk's redirect target is set in code, not by env var (2026-08-23).** `src/proxy.ts`
  passes an explicit `unauthenticatedUrl` to `auth.protect()`. Without it Clerk sends
  signed-out visitors to its hosted Account Portal on a `*.accounts.dev` domain — observed on
  the first smoke test, not theorised — which is off-brand, off-domain, and makes
  `src/app/sign-in/` dead code. The documented alternative, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,
  was rejected because a forgotten deploy variable would silently restore that behaviour.

- **The proxy file is `src/proxy.ts`, not `src/middleware.ts` (2026-08-23).** Next.js 16.3
  deprecates the `middleware` file convention in favour of `proxy` and warns on every build
  under the old name. Clerk's own docs still say `middleware.ts`; `clerkMiddleware` works
  unchanged under the new name, verified by running it rather than assumed. Do not rename it
  back to match Clerk's documentation.

- **A spaced secondary control may sit at 36×36px (owner, 2026-08-23).** § 0.8 and § 9's
  blanket ≥44×44px tap-target floor now carves out a control that is *all* of: secondary, at
  least 8px clear of its neighbours, and not repeated in a dense list. The carousel arrows are
  the case it was written for.
  - **What this costs, stated plainly.** 44×44px is the comfort standard — WCAG 2.1 AAA
    (2.5.5) and both platform HIGs. 36px is below it. It is **not** a violation of WCAG 2.2 AA,
    whose minimum (2.5.8) is 24×24px, so this is a defensible trade rather than a reckless one
    — but it is a trade, and it lands on touch users first.
  - **36px is a floor, not a new default.** Primary actions, list rows, form controls and
    anything a thumb hits repeatedly stay at 44. If this size starts appearing on those, the
    exception has been misread.
  - **Both statements of the rule were amended**, § 0.8 and § 9. A design system that
    contradicts itself in two places is worse than one that says the wrong thing once.

- **The design system may diverge from theAPlink, but only on the record (owner, 2026-08-23).**
  The first amendment: `DESIGN_SYSTEM.md` § 0.8's blanket "no animations over 200ms" now
  carves out a **content crossfade** at up to 400ms. UI feedback — hover, press, open, close —
  keeps the hard 200ms ceiling, so the carve-out cannot spread to the things the rule exists
  to protect.
  - **Why amend rather than override locally.** The portfolio carousel needed 400ms and got
    200ms on the first pass purely because the rule said so; at 200ms a full paragraph
    swapping reads as a flicker. A one-off override in a component would have left the
    codebase quietly contradicting its own design system, which is the failure mode this repo
    keeps legislating against. Changing the rule where the rule lives is the honest version.
  - **The cost, stated plainly:** `design/` was byte-identical to theAPlink's and now is not.
    Nine of ten content files still are. The tenth carries a banner naming the divergence, and
    `design/README.md` carries the table. **Every future divergence goes in that table** —
    otherwise "carried from theAPlink" becomes a claim nobody can check, and a checkable claim
    is the entire value of the folder.
  - **This does not license re-theming.** The palette, the primitives and the patterns are
    still theAPlink's, still verbatim, still not up for reinterpretation.

- **`design/` is excluded from the type-check and the linter (2026-08-23).** The exemplars
  are frozen `.tsx` snapshots carried byte-for-byte from theAPlink, and they import
  `@/components/accounting/palette` and `@/lib/accounting/...` — paths that exist there and
  not here. Left in `tsconfig.json`'s `include`, they fail the build with TS2307, which is
  exactly how this was found: on the first `next build` this repo ever ran. `design/` and
  `uploads/` are both excluded from `tsconfig` and ignored by ESLint.
  - **Do not "fix" the exemplars by rewriting their imports.** Their value is that they are
    identical to theAPlink's; editing them to compile here would destroy the only property
    that makes them a reference. Read them, copy patterns out of them, never compile them.
  - `design/README.md` says this too, at the point someone would trip over it.

- **`eslint-config-next` 16 is consumed as a native flat config, not through
  `@eslint/eslintrc` (2026-08-23).** It exports `Linter.Config[]` directly from
  `eslint-config-next/core-web-vitals` and `/typescript`. Wrapping those in
  `FlatCompat.extends()` — the shape older Next scaffolds use, and the one this repo was
  first written with — throws `Converting circular structure to JSON` before a single file
  is linted. The `@eslint/eslintrc` dependency was removed with it.

- **The app copy of the palette is a byte-identical mirror of `design/palette.ts`
  (2026-08-23).** `src/components/palette.ts` is the runtime module; nothing imports from
  `design/`. This is the mirror pair `design/README.md` describes, and it is currently held
  **by hand** — theAPlink's `npm run lint:design` gate, which makes the mirror real rather
  than aspirational, does not exist here yet. Build it before the pairs multiply.

- **theAPlink's multi-tenancy does not carry over (owner + reading of the brief, 2026-08-23).**
  Savoy Capital is **one fund with multiple investments and two authenticated users**, not a
  multi-tenant product. theAPlink's `Group → Company → Store` hierarchy, per-model
  `companyId` scoping, tenancy Prisma extension, and `check:tenant-scoping` ratchet all exist
  to serve 15–30 companies; none of them has a counterpart here. **Do not import them, and do
  not apply theAPlink's governing design test ("what does adding client #27 cost?")** — it
  is the right question for that product and the wrong one for this.
  - **What this does not license:** skipping authorization. Two users still means the private
    portfolio surface must be genuinely closed to the public one. "Only two people use it" is
    an argument against tenancy machinery, never against an auth boundary.
  - **The thing that does scale here is the investment count, and time.** The portfolio is
    monitored *over time*, so history is a first-class modeling concern from the first
    schema — see `FACTS.md`.

- **Design is carried from theAPlink verbatim, not re-derived (owner, 2026-08-23).**
  `design/` is byte-identical to theAPlink's, including its `AP_`-prefixed filename and its
  AP-domain exemplars. The alternative — extracting a "clean" brand-neutral subset — was not
  taken, because the value of the folder is that it is the *same* look, and a subset drifts
  the moment someone judges what's essential. Read the exemplars for structure; their
  subject matter is theAPlink's and means nothing here.
  - **What did NOT carry:** theAPlink's app code, Prisma schema and 134 migrations, the ten
    `scripts/` guardrail linters and their baselines, `.github/` workflows, `.claude/` hooks
    and rules, `docs/`, and the accumulated `.claudet/` content (LOG, DECISIONS, scoping
    audits). Structure carried; history did not.
  - **Consequence to remember:** `npm run lint:design` — the gate that makes "source of
    truth" true in theAPlink rather than aspirational — does not exist here. Until it does,
    the mirror rule is a convention held by hand, and `design/README.md` says so plainly.
