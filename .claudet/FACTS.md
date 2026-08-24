# FACTS — durable facts about savoycapital

Durable means: true now, and expected to stay true. Anything that changes with a build
belongs in `STATE.md` or `LOG.md` instead.

## The business

- **Savoy Capital is a private investment fund** — principals **Rodney Savoy** and **Jett
  Dueitt** (owner, 2026-08-23).
- It makes **private equity and private debt investments**.
- **One fund, multiple investments.** This is the single most important structural fact
  about the product, and it is where savoycapital diverges hardest from theAPlink — see
  § Not theAPlink below.
- Repo/org: `hteaopco/savoycapital` (private).

## The product — two surfaces, one app

1. **Public: a front-facing landing page for potential clients.** Marketing surface,
   unauthenticated.
2. **Private: a portfolio monitor for Rodney and Jett.** Authenticated. Tracks the fund's
   investments **over time** — so the data model is inherently time-series (positions carry
   a history of marks/valuations/events, not just a current value). Design for that from
   the first schema; retrofitting history onto a current-value model is expensive.

**Documents live in Cloudflare R2** (owner, 2026-08-24) — a private bucket, reached only
through authenticated route handlers under `/api/files`. It is **management-only**: serving
investors needs an authorization layer that does not exist, because "signed in" is the whole
test today. `PLAYBOOKS/storage-r2.md` is the operational detail, and its GOTCHA 1 is the one
that matters — the bucket's privacy is two dashboard toggles, not code.

**The authenticated user population is two people.** Not a growth curve — two. What scales
is the **number of investments**, and modestly. It is enforced by Clerk being set to
**restricted sign-up** — an account cannot exist without an invitation — and by there being
no self-service sign-up route. That setting is the boundary; nothing in this repo re-checks
it. See `PLAYBOOKS/auth-clerk.md`.

## Not theAPlink — what does NOT carry over

The design carries; the architecture largely does not. theAPlink is a multi-tenant product
built for 15–30 companies and 50–100 stores, and nearly every structural decision there
exists to serve that. **Savoy Capital has one fund and two users.**

- **Multi-tenancy is out of scope.** No `Group → Company → Store` hierarchy, no `companyId`
  scoping on every model, no tenancy Prisma extension, no `check:tenant-scoping` ratchet.
  Importing that apparatus would be building for a problem this product does not have.
  - **The schema's `Fund` is not a reversal of this** (owner, 2026-08-24). Deals carry a
    `fundId` because **investors will be scoped by fund** — "investors would be identified by
    fundID, and they would have access to all the deal info within the fundID" — and today
    every deal is fund 1. One column and one relation, added now because it is the
    authorization boundary and retrofitting it onto stored R2 keys later is the expensive
    version. Nothing enforces it by machinery. See DECISIONS 2026-08-24.
- **"What does adding client #27 cost?"** — theAPlink's governing design test — **does not
  apply here.** Do not reach for it.
- No QuickBooks integration is implied. theAPlink's QBO app, OAuth scope, and money-safety
  framing are specific to AP automation and have no counterpart here.

## Conventions adopted from theAPlink

- **Money is handled as integer cents everywhere.** Correct for a fund; adopted deliberately.
- `design/` is the design source of truth and is byte-identical to theAPlink's. Identical by
  intent — do not re-theme.
- `.claudet/` working-memory convention (see its README).

## TO FILL IN

- **Stack.** Following theAPlink. **Confirmed and built:** Next.js 16 (App Router), React 19,
  TypeScript strict, Tailwind for layout only, lucide, inline styles off the `C` palette,
  **Clerk** for auth, **Cloudflare R2** for documents (`@aws-sdk/client-s3`, S3-compatible),
  hosted on Railway. **Prisma 7 + PostgreSQL landed 2026-08-24** (owner: "Add a database") —
  Railway Postgres, schema in `prisma/schema.prisma`, first migration
  `20260824000000_deal_room`. It models the Deal Room only; positions and marks are still
  blocked on a person.
~~- **Domain name** for the public site.~~ **Answered: `savoycapital.io`**, live on Railway
  behind Cloudflare (verified serving the app 2026-08-24). Clerk runs as a **production**
  instance keyed to `clerk.savoycapital.io`, which is why the Clerk DNS records exist and
  why they must be **DNS only** in Cloudflare — see `PLAYBOOKS/auth-clerk.md` GOTCHA 8.
~~- **Hosting.** Not connected to Railway yet (owner, 2026-08-23).~~ **Answered: Railway**,
  live and auto-deploying `main` since 2026-08-23. Struck rather than deleted because this
  line sat directly under the domain entry recording the site as live, and contradicted it.
- **What the portfolio actually tracks.** Position types (equity vs. debt differ
  materially — debt has a rate, term, amortization, and accrual; equity has ownership %,
  cost basis, and marks), what a valuation event is, and what reporting periods matter.
- **Whether the public page collects anything** (contact form, inbound investor interest)
  and where that goes.

## ⚠️ Open question worth answering early — securities marketing

A public, unauthenticated page marketing a **private** fund to "potential clients" is not a
neutral design decision. Private-fund offerings in the US typically rely on exemptions
(e.g. Reg D) that constrain **general solicitation** and what may be said publicly about
performance, returns, and availability. This is not legal advice and nobody here should
guess at it: **confirm with counsel what the public surface may say before building it**,
because the answer determines whether the landing page is a brand page, a gated page, or
something narrower. Recording it here so it is not discovered late.
