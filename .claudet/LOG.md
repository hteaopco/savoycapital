# LOG — savoycapital

Reverse-chronological log of notable changes.

> **Note on this file's future.** theAPlink froze its LOG and now derives change history
> from git (`node scripts/changelog.mjs` — under squash-merge, one merged PR is one entry),
> because hand-appending made it a merge-conflict magnet and let it carry claims that were
> never true. This repo has no such script yet, so this file is hand-written for now. When
> the generator lands, freeze this file rather than keeping both.

- **Deal Room: folders, multi-file upload, and a collapsible upload form** (owner,
  2026-08-24, after uploading 7-8 files one at a time). Three asks in one pass.
  **Folders** are a nullable free-text column on `DealDocument`, not a table — a folder here
  has no owner, description, permissions or nesting, so a table would be a join that buys
  nothing and an empty folder is not a state worth representing. Folders render first and
  closed; loose documents follow and stay visible, which is what the owner asked to protect.
  **A PATCH route moves an existing document** into or out of a folder. Without it the feature
  would only have helped files that did not exist yet — and there were ten sitting in the deal
  that day, five plainly one folder and two another. A grouping feature you must re-upload to
  use is not one.
  **Multi-upload stages files with a description and folder each**, then posts them ONE AT A
  TIME, continuing past a failure. Eight concurrent multipart posts is a thundering herd
  against one container, and a batch that aborts on file three leaves you guessing which of
  eight landed. Descriptions seed from the filename minus its extension, because
  "PG - Stu Stover.pdf" already is the description.
  **The upload card header collapses the form only, never the document list** — hiding the
  documents would defeat the reason for collapsing.
  Verified: `npm run verify` and a clean `next build` with no secrets, and the hand-written
  migration checked against `prisma migrate diff --from-empty --to-schema` — same nullable
  `"folder" TEXT`, same index name and definition. **Not verified: no request reached Postgres
  or R2**, and the migration has not run anywhere.

- **Portfolio: every bucket expands on landing, and the donut is driven by View Details**
  (owner, 2026-08-24). Two behaviours that used to be one click are now separate.
  `openId: string | null` becomes `openIds: Set<string>` seeded with every bucket that has
  holdings — an accordion that closes one bucket to open another cannot show them all at
  once, which was the ask. The bucket row now toggles expansion **only**; it used to set
  `pickedId` as well, so collapsing a bucket silently changed what the donut read.
  A holding's **View Details** now opens its terms *and* points the donut at the parent
  bucket, returning to the whole fund when closed. Read from the owner's own quoting of
  "view details" — the only element carrying that label is the holding-row button, so this
  uses the existing control rather than adding a second one with the same name doing
  something different. A donut arc still picks that segment directly; the chart selects
  itself, but nothing about expansion touches it now.
  Verified off the prerendered HTML: both buckets `aria-expanded="true"`, all three holdings
  mounted, the donut centre reading `$10M` with no "% of fund" line — the signal that nothing
  is picked on load — and the only three accent-filled elements on the page being the nav's
  active row, the account avatar and the "% DEPLOYED" badge, i.e. no legend row is picked.
  **Not verified in a browser:** the transition when a bucket collapses, and how three
  expanded buckets read at ≤767px.

- **The Deal Room, and the first database in this repo** (2026-08-24). Create a deal, upload
  management-facing PDFs/Excel with a description each, download them back with View.
  Postgres holds deal names and descriptions, R2 holds bytes, and the write order is R2 first
  — an orphaned object is survivable, a row whose View button 404s is not.
  **The scoping questions were worth more than the code.** "Files for investors and
  management" collides with a model where `src/proxy.ts` asks only whether somebody is signed
  in; the owner chose management-only. Where descriptions live decided whether a listing costs
  one request or one per file; the owner chose a database over the seat's recommendation of an
  R2 manifest, and that trade is recorded rather than quietly taken. Mid-build he added the
  fund dimension — investors scoped by `fundId`, every deal fund 1 today — which is a
  deliberate override of `FACTS.md`'s "one fund" framing and is now recorded as such in three
  files.
  **Prisma 7 is not Prisma 6.** `url` is gone from `schema.prisma`; migrate reads
  `prisma.config.ts` and the client takes a driver adapter. `prisma.config.ts` reads
  `process.env` rather than Prisma's `env()` helper, because `postinstall` codegen runs in CI
  where no secret is set and the helper treats a missing variable as an error.
  **Landing this falsified four written claims** — `CLAUDE.md` said Prisma was deliberately
  absent and that there is no `prisma generate` step, `FACTS.md` called Prisma unconfirmed,
  `STATE.md` listed it as absent and `prisma/` as empty. All corrected in the same change, per
  the rule that exists because it does not enforce itself.
  Verified: `verify` green, `next build` green from a cleared `.next` **with no
  `DATABASE_URL`**, and the key builder plus prefix guard exercised against 10 cases including
  an investor key being refused by the download route and a `management-private/` lookalike.
  **Not verified: any request reaching Postgres or R2** — the sandbox cannot reach
  `postgres.railway.internal` and the app does not boot locally without a Clerk key. The first
  migration runs on deploy.

- **The portal nav is grouped: Admin over a rule, then Portal Home** (2026-08-24). Owner's
  spec, with a screenshot of theAPlink's own sidebar as the pattern. Two sections with a
  lucide icon and a titled label, children indented behind a vertical spine, one hairline
  rule between the groups. Home moves to **`/home`** — a coming-soon placeholder — and
  **Deal Room** lands at `/deal-room` as a placeholder shell, deliberately empty because the
  owner's instruction was to build the nav first and the screen after.
  `/portal` still redirects to Portfolio and was NOT repointed: `signInFallbackRedirectUrl`
  lands there after sign-in, that prop is the Clerk seat's, and dropping someone onto a
  placeholder the moment they sign in is worse than landing them on a real screen. No nav
  entry points at `/portal` now, which also keeps `pathname === href` from lighting two rows.
  **`design/` has no nav-group-label spec**, so this followed the artifact rather than
  inventing a reading of the canon — `DESIGN_SYSTEM.md` § 2's "Section header 14/800/uppercase"
  is the panel header inside a card, and at that size beside a 15px wordmark in a 240px rail
  it would out-shout the wordmark. Recorded here rather than as a `design/` amendment,
  because nothing in `design/` was changed.
  Verified off the **emitted HTML** rather than the diff, since the app cannot boot locally
  without a Clerk key: both new pages prerender, so `.next/server/app/{home,deal-room}.html`
  carry the real markup — six icons, correct link order, one rule, two spines, the 44px touch
  floor on all four links, and exactly one accent-filled row per page with `aria-current`
  landing on the right one. **Not verified: anything requiring a browser** — spine alignment,
  the ≤767px drawer, real tap geometry.
  The per-item ticks in the owner's screenshot are not drawn; the spine alone carries the
  grouping.

- **Cloudflare R2 document store, management-only** (2026-08-24). The owner created a bucket
  for "investors and management" and asked what it needed. The storage half was
  straightforward; the ask was not, and the useful part of this change was refusing to build
  past the question.
  **"Files for investors" collides with the model the app rests on.** `src/proxy.ts` asks one
  question — is somebody signed in? — and there is deliberately no authorization layer behind
  it, because sign-up is restricted and the population is two people who both see everything.
  Give investors Clerk accounts under that model and every investor reaches
  `/portal/portfolio`: fund size, every position, every amount, plus every other investor's
  documents. Put to the owner rather than guessed; answer was management-only for now, so
  `PREFIX.investors` is reserved and no route reads it.
  Shipped: `src/lib/r2.ts` plus `/api/files` and `/api/files/[...key]`. Bytes stream through
  the handlers rather than presigned URLs — a presigned URL is valid for its whole TTL to
  whoever holds it, and streaming means the bucket needs **no CORS policy at all** because the
  browser never talks to R2. Downloads are always `Content-Disposition: attachment`: an
  uploaded HTML or SVG served inline would execute on our own origin against a signed-in
  session. Out-of-prefix keys 404 rather than 403, because a distinct status confirms the
  object exists.
  The client is built lazily so `next build` still passes with no secrets — CI sets none on
  purpose, and a module-scope `new S3Client()` would have quietly made the build need one.
  Verified the two security-relevant pure functions against 15 cases including CRLF header
  injection, a quote closing `filename=""` early, traversal, and a `management-private/`
  prefix lookalike. Not verified in a browser: the app does not boot locally without a Clerk
  key, so no request has actually reached the bucket from this machine.
  **The privacy boundary is not in this repo** — it is the bucket's Public Development URL and
  Custom Domain both being off. `PLAYBOOKS/storage-r2.md` GOTCHA 1.

- **Post-login redirect sent users to `localhost:8080`** (2026-08-24). Caught by sweeping the
  live site immediately after the first deploy of the auth boundary, not by a report. The
  boundary itself was correct — `/portfolio` closed, public routes untouched — but the
  proxy built `redirect_url` from `request.url`, which behind Railway is the container's
  internal address. A user who signed in successfully would have been dropped at
  `https://localhost:8080/portfolio`.
  Fixed by making the return path **relative**, which removes the need to reconstruct the
  public origin at all. The other available fix — reading `X-Forwarded-Host` — was rejected:
  that header is attacker-controlled unless the proxy overwrites it, and putting it in a
  redirect target is how open redirects get built. GOTCHA 11, with the general rule that
  `request.url` must never end up in anything that outlives the redirect.
  Also cleaned up a comment in `src/proxy.ts` still describing `checkAccess()`, which was
  deleted with the allowlist — a stale comment about an auth check is worse than none.

- **`/portfolio` is closed; the auth work rebased onto it** (2026-08-24). The Clerk branch was
  built against a repo whose private surface did not exist yet, so it carried a placeholder
  `/monitor` behind a `(private)` route group. `#9` and `#10` landed the real thing —
  `/portfolio`, the fund allocation with position-level amounts — and shipped it
  **unauthenticated by an explicit owner call**, linked from the public homepage as "Investor
  login", with `noindex` as the stated mitigation and a note in its own header saying to put
  it behind auth before the site is promoted.
  This is that. Rebased onto `main`; the placeholder `/monitor` and the `(private)` group are
  **deleted** rather than kept, because `/portfolio` supersedes them and two private surfaces
  would be one more than anyone can keep straight. `/portfolio` needs no marker to be
  protected — it is protected by not appearing in `src/proxy.ts`'s public list, which is what
  deny-by-default buys.
  Measured before and after, not assumed: `https://savoycapital.io/portfolio` returned **HTTP
  200 with the allocation to an anonymous request**; the rebased build returns **307 to
  `/sign-in`** and serves no page content at all.
  Also: `SiteNav` gains an optional `trailing` slot so `/portfolio` can carry Clerk's
  `<UserButton />` for sign-out — a slot rather than an `auth` flag, so the shared nav still
  knows nothing about authentication. The landing page's "Investor login" link is unchanged
  from `main`; it already pointed at `/portfolio`, which now requires a session.

- **The in-app allowlist is removed; restricted sign-up is the whole boundary** (2026-08-24,
  owner's call). `SAVOY_ALLOWED_PHONES` and `src/lib/auth.ts` are deleted, and
  `(private)/layout.tsx` no longer refuses anyone — Clerk's `sign_up.mode: "restricted"` means
  an account cannot exist without an invitation, so "signed in" and "allowed in" are the same
  statement and `src/proxy.ts` enforcing one enforces both.
  **The owner's objection was the right one:** putting user identities in an env var means a
  redeploy to add a person and a list that drifts from the invitations it mirrors. That is not
  how this is normally done, and the reason it was built that way had expired — the allowlist
  was designed when the instance was `sign_up.mode: "public"`, where a session genuinely proved
  nothing. Restricting sign-up removed the premise.
  **What it costs, recorded because it is silent:** the security boundary now lives in a Clerk
  Dashboard toggle that no code here can see. If sign-up returns to `public`, `/monitor` opens
  to anyone who signs up and nothing notices. GOTCHA 3 is a one-line curl against a public
  endpoint that answers it; treat that setting as code.
  Same day, before this: the allowlist had been rewritten from emails to **phone numbers**,
  after reading the live instance showed it identifies users by phone with email off — an email
  allowlist would have rejected the principals along with everyone else. That work is gone with
  the allowlist, but the finding is not: `firstName` is the only reliable display value on this
  instance, kept as GOTCHA 9.
  Also fixed today: **Cloudflare Error 1000** on the Clerk DNS records (proxied instead of
  DNS-only) — `clerk.` now serves real Clerk JSON, `accounts.` still shows an interstitial and
  wants the same fix; and sign-up mode was moved from `public` to `restricted`.

- **Clerk is wired up: the auth boundary exists, and it is closed by an allowlist**
  (2026-08-23). `@clerk/nextjs` 7.8, `<ClerkProvider>` in the root layout with the `C`
  palette mapped onto Clerk's appearance variables (no raw hex reaches its components), a
  styled `/sign-in`, a `(private)` route group, and `/monitor` as its first — deliberately
  empty — page.
  **Two layers, not one.** `src/proxy.ts` decides whether *somebody* is signed in;
  `src/lib/auth.ts` decides whether that someone is one of ours, against
  `SAVOY_ALLOWED_EMAILS`. The second layer is the point: Clerk alone cannot tell you whether
  a stranger may create an account — that is a Dashboard setting no one can verify from this
  repo. Rationale and the fail-closed cost are in DECISIONS.
  Route protection is **deny-by-default**: the public routes are enumerated and everything
  else needs a session, so a forgotten private page fails shut and a forgotten public page
  merely asks for a login.
  **A real defect was found by testing rather than shipped.** The first smoke test redirected
  signed-out visitors to Clerk's hosted portal on a `*.accounts.dev` domain, which would have
  left the styled `/sign-in` page as dead code. `src/proxy.ts` now sets `unauthenticatedUrl`
  explicitly. GOTCHA 1 in the playbook.
  Verified end to end against a running production server: public routes 200, `/monitor` and
  unknown routes 307 to `/sign-in` **on this domain** with `redirect_url` preserved, the
  landing page still server-rendering all three investments, and `next build` passing with
  the Clerk keys *unset* (so the Railway build cannot break before the keys land). The
  allowlist logic was separately exercised over 12 cases — fail-closed on unset, empty and
  whitespace-only lists, unverified addresses rejected, case/whitespace tolerance, secondary
  verified addresses accepted, lookalike domain rejected.
  **Not live.** Four steps need a person with the Clerk Dashboard — create the app, restrict
  sign-up to invitation-only, invite Rodney and Jett, set the env vars — and until then the
  monitor correctly refuses everyone. The public "Investor login" link still points at
  `/coming-soon` on purpose; flipping it to `/sign-in` is the owner's call.
  Also: the proxy lives at `src/proxy.ts`, not `src/middleware.ts` — Next 16.3 deprecated the
  old name and warns on every build. First playbook in the repo: `PLAYBOOKS/auth-clerk.md`.

- **Carousel arrows drop to 36px at every width; the tap-target rule amended to allow it**
  (2026-08-23, owner). Second deliberate divergence of `design/` from theAPlink, and the second
  amendment to the same principle. The blanket ≥44×44px floor now carves out a control that is
  secondary, ≥8px clear of its neighbours, and not in a dense list. Amended in **both** places
  the rule is stated (§ 0.8 and § 9) so the document does not contradict itself; the banner and
  `design/README.md`'s divergence table both carry two rows now.
  Honest accounting of the cost: 44px is the WCAG 2.1 AAA / platform-HIG comfort standard and
  36px is below it, but it clears WCAG 2.2 AA's 24×24px minimum comfortably. A defensible
  trade, not a free one, and it lands on touch users.

- **Crossfade to 400ms — by amending the design system, not overriding it** (2026-08-23,
  owner). `design/DESIGN_SYSTEM.md` § 0.8's blanket "no animations over 200ms" now carves out
  a **content crossfade** at up to 400ms; UI feedback keeps the hard 200ms ceiling. This is
  **the first deliberate divergence of `design/` from theAPlink** — nine of ten content files
  are still byte-identical (verified), the tenth carries a banner explaining the difference to
  anyone diffing it, and `design/README.md` now holds the divergence table every future
  amendment must join. Rationale in DECISIONS.
  Also: the top-right arrow pair is deleted (the pair below the card remains), and the
  remaining arrows shrink to 36px from `md` up while **staying 44px on touch** — § 0.8's
  ≥44×44px floor is written for "every interactive element a thumb hits", so the desktop size
  is a free choice and the mobile size is the rule.

- **Carousel reworked: 6s, crossfade, arrows in two places, no pause button** (2026-08-23,
  owner's changes). Interval 3s -> 6s. Slides crossfade instead of cutting; the fade is
  **200ms because `design/DESIGN_SYSTEM.md` § 0.8 says no animation may exceed it** — at a 6s
  interval a slower fade would feel better, and the documented rule wins over that preference.
  The "Current" badge moved down onto the instrument/year row. The pause button is gone;
  clicking an arrow or a dot is what stops the rotation. Arrows now appear twice — top right
  and flanking the dots below the card — per the owner's second option.
  **The rewrite changed how slides render, and that fixed the SEO gap logged above.** All three
  are now rendered and stacked in one grid cell with opacity switching between them, so every
  write-up is in the server HTML rather than appearing only on interaction. The stack also
  sizes to the tallest slide, so the card no longer resizes as it advances, and there is no
  fixed text height to overflow on a narrow screen. `visibility` (delayed by the fade) keeps an
  inactive slide's link out of the tab order.
  With no play control on the page, `prefers-reduced-motion` now simply means the carousel does
  not auto-advance; the arrows still work.
  Also: the explanatory line under "Coming soon." on `/coming-soon` was cut — the page is now
  just the heading and a link back.

- **Real portfolio copy replaces every placeholder in the carousel** (2026-08-23, owner-
  supplied). All three slides now carry the owner's own write-ups, instrument (Private Credit
  / Private Equity), year (2026), a "Current" status badge, and a link to the company site.
  No `[BRACKETED]` value remains anywhere on the public page.
  Two corrections made to the supplied copy, both flagged: the company is **Marucci** (its own
  domain is maruccisports.com), supplied variously as "Marruci" and "Marrucci"; and the
  displayed link labels are normalised to bare domains, since one of the three arrived without
  a `www.` prefix.
  Slide order follows the order the owner listed them: HTeaO Franchisee, Westfield, Marucci.
  **Note the HTeaO slide is an investment in the largest FRANCHISEE, not in HTeaO itself**, and
  it carries the HTeaO brand mark. That is normal for how funds present a franchisee position,
  but it is a distinction worth keeping straight if anyone later reads the page as an HTeaO
  holding.
  Known tradeoff, not a defect: only the first slide's copy is in the server-rendered HTML —
  the carousel renders one slide at a time. The other two ship in the client bundle (verified)
  and appear on interaction, so a crawler or a JS-off reader sees one investment, not three.

- **Landing page cut back to the portfolio; carousel gains autoplay** (2026-08-23, owner's
  changes). The "What we invest in" section and the whole footer are removed — the instrument
  cards were carrying six bracketed placeholders and the owner pulled them "until we get more
  formal." Recent Investments is now the page: it is the hero, its heading is "Our Portfolio",
  and the `<h1>` moved with it. Investor login points at a new `/coming-soon` (noindex — a
  placeholder page ranking for the firm's name is worse than no result).
  Carousel: auto-advances every 3s, with a pause/play button, and any manual move — arrows or
  dots — stops the autoplay for good. `prefers-reduced-motion` sets the initial state, but an
  explicit press overrides it either way, since a play button that does nothing is worse than
  ignoring the preference.
  The image panel is now a FIXED height (200px / 280px at md) rather than min-height. HTeaO's
  mark is taller in aspect than the other two, so the panel used to grow for it and the card
  resized mid-rotation.
  **The securities disclosure went with the footer** — the page now carries none. It was
  placeholder text, not usable language, so nothing of value was lost, but real language has
  to land before the site is promoted to anyone. Still recorded in `FACTS.md`.

- **First deploy is live on Railway** (2026-08-23, owner-confirmed). The public landing page
  is serving. Deploy shape: Nixpacks, `npm run build`, `npm run start`, healthcheck on
  `/api/health`, Node 22 via `.nvmrc`. Nothing about the app changed to make this work — the
  earlier failure was a host pointed at a repo with no `package.json`, and it resolved when
  the app merged to `main`.

- **The app exists: Next.js scaffold + the landing page in real code** (2026-08-23). Built
  in response to a failed deploy — a host had been pointed at a repo with no `package.json`,
  no `railway.json` and nothing any builder could act on, which was the direct consequence
  of the deliberate keep-it-blank decision rather than a regression. Next.js 16, React 19,
  TypeScript strict, Tailwind for layout only, lucide-react for icons, `/api/health` for
  Railway's healthcheck, `railway.json` for the deploy.
  The landing page ports the design canvas: "What we invest in" over a Recent Investments
  carousel with the three investment images. Theming is inline styles off the `C` palette
  with no raw hex, per `design/AP_DESIGN_REFERENCE.md` § 2; responsive sizing uses `clamp()`
  rather than media queries so the rule holds.
  Two build failures found and fixed rather than guessed at: `design/`'s frozen exemplars
  were being type-checked (TS2307 on theAPlink import paths), and the `@eslint/eslintrc`
  shim crashed against `eslint-config-next` 16's native flat config. Both recorded in
  DECISIONS with why the obvious fix is wrong. Verified before commit: clean `npm run build`,
  `npm run verify` green, and the production server serving `/`, `/api/health` and all three
  image assets.

- **`uploads/` added; investment logos moved out of `design/`** (2026-08-23). Three files for
  the landing page's Recent Investments section (Westfield Fluid Controls, HTeaO, Marucci)
  were uploaded into `design/` through the GitHub web UI. Moved to a new top-level
  `uploads/` — a drop-off for raw material handed over from outside the repo, explicitly not
  an asset directory nothing should import from. `design/` is verified byte-identical to
  theAPlink again (10/10 content files); loose uploads sitting in it blur the source-of-truth
  line. `marruci.png` renamed to `marucci.png` to match the company.

- **Architecture folders scaffolded, deliberately empty** (2026-08-23). The directory
  skeleton mirroring theAPlink's shape — `.claude/{hooks,rules}`, `.github/workflows`,
  `docs/`, `prisma/migrations/`, `scripts/`, `src/{app,app/api,components,content,lib}` —
  created and held by `.gitkeep`. Owner's instruction was infrastructure and architecture
  folders only, everything blank outside `design/`. No `package.json`, no configs, no schema,
  no source files, and no `src/lib` domain subfolders — theAPlink's (`accounting`,
  `quickbooks`, `labor`, `tenancy`) are its own and guessing this product's would be
  inventing structure ahead of the decisions that shape it.

- **Product defined; multi-tenancy ruled out** (2026-08-23). Savoy Capital is a private
  investment fund (Rodney Savoy, Jett Dueitt) making PE and private-debt investments — one
  fund, multiple investments, two authenticated users, plus a public landing page for
  prospective clients. `FACTS.md` rewritten from placeholders to the real brief.
  `DECISIONS.md` records that theAPlink's tenancy apparatus does **not** carry over, and that
  this is not a license to skip the auth boundary. Two open items recorded rather than
  guessed: what an equity vs. debt position holds, and whether a public page marketing a
  private fund is constrained by securities-marketing rules (counsel question, gates the
  public surface only). `design/README.md` notes the folder covers the portfolio monitor but
  not the marketing surface. `main` established as the base branch.

- **Repo scaffolded from theAPlink: design + working-memory structure** (2026-08-23).
  `design/` copied byte-for-byte (11 files, verified by checksum) with only `README.md`
  rewritten — theAPlink's version asserts a mirror gate (`npm run lint:design`) and app
  paths that don't exist here, and an unenforced rule described as enforced is worse than an
  acknowledged convention. `.claudet/` created as structure only: the file set, the
  conventions, and the READMEs that explain them, with none of theAPlink's accumulated
  content. `.gitignore` carried, less its one theAPlink-specific entry. No app code, no
  configs, no CI.
