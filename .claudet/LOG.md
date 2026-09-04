# LOG — savoycapital

Reverse-chronological log of notable changes.

> **Note on this file's future.** theAPlink froze its LOG and now derives change history
> from git (`node scripts/changelog.mjs` — under squash-merge, one merged PR is one entry),
> because hand-appending made it a merge-conflict magnet and let it carry claims that were
> never true. This repo has no such script yet, so this file is hand-written for now. When
> the generator lands, freeze this file rather than keeping both.

- **Mallard Bay Outdoors on the public carousel, and the deal name became editable**
  (owner, 2026-09-04: *"i want to upload this investment on the main page"*, *"need a way to
  edit name of the deal"*).
  **The investments array moved to `src/content/investments.ts`.** `CLAUDE.md`'s NO HARDCODING
  rule names this case exactly — "no position names ... written as a literal inside
  `src/components/**`" — and three had been sitting in `RecentInvestments.tsx` since it was
  built. Adding a fourth would have been a fourth violation rather than a first. The TYPE stays
  in the component and the content imports it, matching `src/lib/portfolio.ts` ↔
  `FundAllocation`.
  **Appended, not prepended.** The carousel opens on entry one, so leading with the newest
  investment would have changed which slide the public page opens on — a visible change nobody
  asked for. Order is deal order and the file now says so.
  **The logo was NOT owner-supplied.** The attachment did not survive upload (nothing reached
  disk), so it was taken from mallardbay.com's own `mb-logo` asset and rasterised with the
  `sharp` already in `node_modules` — SVG at 600dpi → 1200×131 transparent PNG. Provenance is
  recorded in `uploads/README.md` because the other three came from the owner and this one did
  not; that difference should be visible to whoever looks next.
  Instrument and year are the owner's ("it is private equity, you can set it", "2026 current
  investment"), and the owner set Deal 4's `instrument` in the Deal Room directly — this
  session has no `DATABASE_URL` and cannot write to Postgres.
  **Renaming a deal was never the same case as re-homing one.** The PATCH route's header
  grouped `name` and `fundId` under one "not editable" sentence whose entire argument was about
  stranded R2 keys — and the name is not in a key
  (`<audience>/funds/<fundId>/deals/<dealId>/<uuid>/<filename>`). A rename strands nothing.
  `fundId` stays immutable for the original reason; the comment now argues them separately.
  The name is the one field on that route with **no empty state** — a nameless deal cannot be
  told apart in a list — so blank is a 400 rather than a clear, and Save is disabled on it.
  Enter saves, Escape abandons, Cancel restores the STORED name rather than the typed one.
  **Verified against the emitted HTML**, which is available again because the public page is
  static: all four slides present, in deal order, Mallard Bay last.

- **The holding panel became a chain** (owner, 2026-08-24: *"i would like tfor the 'why we like
  it' to be off the card to the right. have the line on the right side of card and the why we
  like it box after that"*). `card ──── detail panel ──── Why We Like It`.
  **Three layouts, and the middle one is the point.** ≥1860px the full chain; 1536–1860 the
  tray floats right of the card with the panels **stacked**; below 1536 it drops inline under
  the row. Pushing the whole tray out to 1860 would have taken the floating detail panel away
  from everyone between 1536 and 1860 who has it today, and running the chain at 1536 would
  hang the second panel off the right edge. A tray that is a flex column until it has room to
  be a flex row gets both, with no JavaScript deciding anything.
  **1860 is arithmetic**, same convention as the existing sum:
  `240 + 64 + 780 + 98 + 320 + 72 + 280 = 1854`, six pixels of slack. The thesis panel is 280
  rather than 320 because that is what the sum had left — spend that number if the chain should
  reach narrower screens, and move 1860 with it.
  **A third breakpoint on one component**, which `ui-governance.md` § 4 permits in spirit
  ("derived from arithmetic and shown at the call site") but describes as "a second". Flagged
  for the owner rather than edited — amending that file is not this seat's call.
  **Two claims from hours earlier are now false and are fixed here**: `DetailRow.prose` is gone
  (the flag existed only to make a paragraph survive inside the figures panel, which is exactly
  the problem its own panel solves) and the `DECISIONS` bullet describing it.
  **Verified against the emitted CSS, twice over.** All nine `min-[1860px]:` classes are
  present, every `2xl:` class the existing panel needs is still present, and — the one that
  could have failed silently — the `min-width:1860px` block is emitted **after** the
  `min-width:1536px` block, so `w-[672px]` wins over `w-[320px]` on the tray. Had Tailwind
  ordered them the other way, 672px of content would sit in a 320px box, at one width, with
  every gate green.

- **"Why We Like It" moved onto Portfolio, for investors** (owner, 2026-08-24: *"it needs to
  be on portfolio. its for the investors, a quick snippet of why we like it"*).
  A fifth row on the holding drill-down, last, after the facts — the panel header already
  carries the name and the amount, so the figures read first and the narrative closes.
  **This reverses the call made hours earlier on the same field**, and the reversal is recorded
  rather than papered over: the useful fact is that a disclosure question was put to the owner
  and answered by the person entitled to answer it. Five statements said the opposite and all
  five are corrected here — the schema comment, the `DealRoom` type, the PATCH route header,
  `DECISIONS.md` and the previous LOG entry.
  **`DetailRow` gained `prose?`** to render it — *reverted the same day; the thesis became its
  own panel and the flag went with it. See the entry above.*
  **The consequence worth carrying: the Deal Room field is no longer a scratchpad.** What is
  typed there is read by that fund's investors, with no draft state and no second copy.
  `src/lib/authz.ts` still scopes Portfolio by fund, so an investor sees their own fund's deals
  and no others — that is the only boundary around this text.

- **"Why We Like It" — a thesis panel on a line off the Investment card** (owner, 2026-08-24:
  *"lets add a 'Why We Like It' modal to the right of the deal info card ... have another line
  coming off the card to the right with a modal just like the investment info. it will be a
  paragraph in the investments section"*).
  `Deal.whyWeLikeIt`, a nullable TEXT column capped at **2,000** characters at the route —
  four times `terms`/`fees`, because those render as one line each and this is prose. Both caps
  are product rules about what fits the panel, which is why neither is a `VARCHAR(n)`.
  **It is one form, not two.** The panel is part of `DealFigures` and saves with the existing
  Save button. Two Save buttons on one card is how half a deal gets saved.
  **The breakpoint is arithmetic, re-done from THIS screen's widths.** The Deal Room card is
  900 wide where Portfolio's is 780, so the same 72px gap and 320px panel need more room:
  `240 + 64 + 900 + 72 + 320 = 1596`, which is why it floats at `min-[1640px]:` and not at
  `2xl:`. Below that it stacks inline in the card and the connector is hidden.
  **Verified against the emitted CSS, not the diff.** All nine arbitrary Tailwind classes and
  the `@media (min-width:1640px)` block are in `.next/static/chunks/*.css`. This repo has been
  bitten before by a class assembled from a variable that silently never reaches the
  stylesheet, so the classes are written out in full and then checked.
  **`panel-motion.ts` is new**, holding the six motion/weight constants both connected panels
  use. `FundAllocation` had them as local literals; a second panel would have made two copies
  of four magic numbers on two screens — the exact cross-file drift `ui-governance.md` § 3
  says the lint cannot see. **Geometry is deliberately NOT shared**: each screen's offsets and
  breakpoint come from its own card width, and sharing those would make one screen's layout
  depend on the other's.
  The refactor moved no values — the diff on `FundAllocation.tsx` is deletions only, and the
  `2xl:` block in the emitted CSS is byte-for-byte the same set of rules.
  **Management-facing only** — *reversed hours later by the owner; see the entry above.* The
  call at the time was that a thesis in front of investors should be asked for rather than
  arrive as a side effect of adding a column. It was then asked for.
  Migration `20260824214500_deal_why_we_like_it` confirmed identical to `prisma migrate diff`.
  **Not verified: nothing has been written to Postgres from here.**

- **Portfolio reads the database, and amounts carry commas** (owner, 2026-08-24: *"lets tie
  the porfolio values to the values in fund and investments"*, *"use the comma separator..IE
  instead of 10000000 make it 10,000,000"*).
  **The bug this closes was reported, not found:** *"it did not change the fund size when i
  changed it here fyi."* The save had worked. Portfolio was rendering
  `src/content/fund-allocation.ts` — a second copy of the same figure, and the copy nobody
  could edit. One figure, two sources, and the screen drew the wrong one.
  `src/lib/portfolio.ts` now builds the chart from `Fund.sizeCents` and each
  `Deal.amountCents`, grouped by a new `Deal.instrument` enum. `fund-allocation.ts` keeps
  **only** `FUND_AS_OF`, because there is nothing in the schema that date could honestly come
  from — it is the date of the MARKS and there are no marks; `inceptionDate` and the latest
  investment date each mean something else.
  **What cannot be plotted is named on the screen, not dropped.** A deal needs an amount and
  an instrument; missing either, it appears in an amber "Not shown on the chart" line by name
  with what it needs. Silently omitting a row would make the chart quietly disagree with the
  Deal Room, and this is a chart of a fund's money.
  Four empty states kept apart on purpose — no database, no such fund, no fund size, no
  plottable deals. Collapsing them would send somebody to fix the wrong thing, and
  **"no such fund" is the one a fresh deploy actually hits**: a management viewer with no
  assignment falls back to fund 1 and an empty database has no fund 1. Caught in review; the
  first cut returned one `null` for that and for a missing `DATABASE_URL`, so a working
  database would have reported itself unconfigured.
  **Unallocated is still derived** and must stay that way: `FundAllocation` computes it as
  fund size less everything deployed, so a split that fails to add up cannot render. The
  figures this chart was first built from arrived $10,000 over.
  `Deal.terms` and `Deal.fees` are **free text**, matching the drill-down panel they feed.
  What a position actually holds is still the decision blocked on a person; modelling it now
  to look thorough means the real schema starts by undoing it.
  Commas: `centsToDollarInput` groups, `groupDollarInput` re-groups on **blur only** — never
  per keystroke, because reformatting mid-word moves the caret. Anything that does not parse
  is left exactly as typed for the person to fix. `parseDollarsToCents` already stripped
  commas on both sides of the wire, so no route changed.
  Migration `20260824210000_deal_instrument` hand-written, then diffed against
  `prisma migrate diff --from-schema/--to-schema --script` and confirmed identical. Additive;
  no existing row changes.
  **Consequence worth stating: after this deploys the chart shows what is in Postgres, which
  is not what it showed before.** The fund size and each deal's amount and instrument have to
  be entered under Fund & Users and in the Deal Room. That is the point of the change, and
  the screen names every missing value rather than leaving a blank.
  **Not verified: nothing has been written to Postgres from here.** The migration has not run
  anywhere this session can reach.

- **Fund size, deal investment size and date, and a fund filter on the Deal Room** (owner,
  2026-08-24). Funds gain `sizeCents` alongside `inceptionDate`; deals gain `amountCents` and
  `investmentDate`; the Deal Room gets a fund picker defaulting to Savoy Capital.
  **Money is `BigInt`, not `Int`, and that is the load-bearing decision.** A Postgres
  `INTEGER` stops at 2,147,483,647 — **$21,474,836** in cents. The fund is already at $10M,
  half that ceiling, so `INTEGER` would have been a limit the schema imposed on the business,
  discovered on the write that crossed it. Cents stay exact as a JS `number` to about $90
  trillion, so only the column is wide and the API sends `Number(...)`.
  **All three columns are nullable and the screens open their editors when a value is
  missing** (owner: "can you make it to where i can backfill the values on first load"). Fund
  1 and the existing deal predate the columns, and this repo may not invent a fund figure — a
  migration backfilling from `src/content/fund-allocation.ts` would have written a money
  figure onto the fund every deal belongs to.
  The deal list is scoped **server-side** by `fundId` rather than filtered in the browser: a
  client-side filter means every fund's deals were sent and merely hidden.
  Two bugs caught while building rather than after: `reloadDeals` still had `[]` deps once the
  fetch became fund-scoped, which would have re-fetched the fund selected at mount forever;
  and `DealDetailView`'s `onUploaded` became false when a third thing could change the screen,
  so it is `onChanged`.
  **`Portfolio` still read the content module, not these columns** — the owner named
  database-driven figures as a future phase, so two sources of the fund size existed and only
  one rendered. **Corrected on the next change:** the owner hit exactly the failure that
  implies ("it did not change the fund size when i changed it here"), and Portfolio now reads
  Postgres. See the entry above.
  Money and date parsing exercised against 21 cases including `$50,000,000`, which is past
  `INTEGER`'s ceiling and would not have fit the column this change replaced.
  **Not verified: nothing has been written to Postgres.** The migration has not run anywhere.

- **Role enforcement, and the Create New Fund collapse** (owner, 2026-08-24: *"roles
  assigned"*, *"put a collapse on create new fund...default to collapse"*).
  `src/lib/authz.ts` decides what a signed-in person may see. Management everything;
  an investor their own fund's portfolio only — not the Deal Room, not Fund & Users, not
  another fund; an unassigned account **nothing**. Read by pages and route handlers, never by
  `src/proxy.ts`, which runs on the edge where Prisma cannot go.
  **Every API route was guarded, not just the pages.** Nine route files, fourteen handlers; a
  page redirect that left the API open would be theatre. Verified by grepping for any remaining
  bare `auth()` in `src/app/api/` — none.
  **The bootstrap valve is the part to remember: an EMPTY `UserRole` table treats everyone as
  management.** Without it the first deploy locks the owners out of their own portal and
  nothing here can reach Postgres to undo it. It closes as soon as one assignment exists, and
  the Portfolio screen banners the state. The inverted consequence is worth knowing — deleting
  every assignment unlocks the app rather than locking it.
  Nine written claims about there being no authorization layer were falsified and corrected in
  the same change: `CLAUDE.md`'s disclosure-risk paragraph, `src/proxy.ts`'s own comment,
  `auth-clerk.md`'s layer table, `r2.ts`'s investors-prefix note, `FACTS.md`, and the
  fund-users playbook.
  Verified by exercising the decision table directly — 15 cases including an investor of fund 1
  refused fund 2, an unassigned viewer refused everything, and the two 403 messages naming the
  state rather than the rule. The predicates were extracted mechanically from the real file
  because extensionless imports do not resolve under node's ESM loader; `getViewer` itself
  needs a database and is **not** covered.
  **Not verified: no request has reached Postgres from here, and nobody has signed in as an
  investor anywhere.**

- **Clerk becomes the roster; the phone-keyed `User` table is dropped** (owner, 2026-08-24:
  *"can we just read users from clerk?"*). Answered by reading the SDK rather than from
  memory, and two of the three answers changed the design.
  **Yes to reading from Clerk** — `users.getUserList()`. **No to inviting from the app**:
  `createInvitation` requires `emailAddress` and has no phone field, and this instance
  identifies people by phone, so an invite flow does not fit without changing how the
  instance identifies people — the Clerk seat's call. Accounts stay Dashboard-invited.
  **So the table shipped an hour earlier was the wrong shape** and is dropped. `UserRole`
  replaces it: `clerkUserId`, `fundId`, `role`. Every row on the Users tab is now a real
  account that can really sign in, with two dropdowns that save on change. Two lists of people
  that nothing reconciles will disagree, and the one that gates sign-in is Clerk's.
  **Still enforces nothing**, deliberately: the owner chose to collect assignments first, so
  the enforcement change lands against data that exists. Agreed scope for it — an investor
  sees their fund's investor-facing documents **and** that fund's portfolio; not the Deal Room.
  `server-only` earned its place: it turned a client component importing the Clerk helper into
  a build error instead of a runtime leak, and is now a declared dependency rather than a
  transitive one. The constant it wanted is passed as a prop.
  Migration diffed against `prisma migrate diff` — identical. Full CI path reproduced: `npm ci`
  then `next build`, no `DATABASE_URL`, no `CLERK_SECRET_KEY`, no R2 keys.
  **Not verified: no request has reached Clerk's backend API or Postgres from here.**

- **Fund & Users: a roster that deliberately grants nothing** (owner, 2026-08-24). Second
  screen under Admin, with a Fund | Users toggle. Funds get a name and an optional inception
  date; users get first name, last name, phone, fund and role.
  **The load-bearing part is what it does NOT do.** Creating a user does not create a Clerk
  account, send an invitation, or let anyone sign in; deleting one revokes nothing. Access is
  still restricted sign-up plus a Dashboard invitation. A people table beside a Role column
  reads as a permissions system, and the failure that invites — believing somebody was removed
  when they were not — is silent, so the warning is on the screen and not only in a doc.
  `phone` is unique and unnormalised: it is the join to a Clerk identity, which identifies by
  phone rather than email, and guessing a country code wrong there is worse than storing what
  was typed. A collision answers 409 naming whose number it is, checked before the insert and
  caught after it.
  `inceptionDate` is a nullable `DATE` — fund 1 predates the column and an inception date is a
  fund figure this repo may not invent.
  The migration was hand-written and **diffed against `prisma migrate diff` to a byte**, which
  is how a migration gets verified with no database to run it against. Full CI path reproduced
  locally: `npm ci` then `next build` with no `DATABASE_URL` and no R2 keys.
  **Not verified: nothing has been written to Postgres.** The migration has not run anywhere.

- **The carousel photo goes back to `cover`, and the crop is now a settled decision** (owner,
  2026-08-24: "that looks worse, lets just revert...it looked better before"). Shipped as
  `contain` so nothing was cut off, looked at on the deployed site, and reverted within the
  hour. A 900x412 photo in a ~478x280 frame either loses its edges or gains letterbox bands;
  the owner saw both and picked the crop.
  **The revert is exact** — the component is byte-identical to its pre-change state, so the
  LOGO fix from the previous PR is untouched and only the photo branch moved back.
  The type carries a note saying the crop is deliberate and that `contain` was tried and
  rejected, because the next agent to look at that slide will see a photo missing its left
  third and recognise it as the defect that was just fixed one branch over. It is not. If a
  photo's crop needs to change, the lever is the source image's aspect ratio.

- **REVERTED, same day — see the entry above.** ~~The Marucci photo was still cropped;
  `cover` is gone from the carousel~~ (owner, 2026-08-24). The previous fix changed the LOGO branch only. The photo branch still used
  `objectFit: cover`, which fills a frame by scaling up and slicing off whatever does not
  fit — on a 900x412 image in a ~478x280 frame that removed the left third, text baked into
  the photo included. Now `contain`, like the logos.
  **The two treatments still differ, and the difference is now padding alone:** a logo sits
  inside `inset-5`/`md:inset-8`, a photo runs edge to edge. Nothing in the carousel crops.
  The type's own comment said "photo fills the frame edge to edge", which was the sentence
  that made cropping sound like the intent; it now says what the code does.

- **Logos were clipped and off-centre; the frame is now `fill` + `contain`** (owner,
  2026-08-24). The logo branch sized the image from its intrinsic 520x360 and relied on
  `max-height: 100%` to clamp it — a percentage that has to resolve through a stretched grid
  item to the slide's content box. When it does not resolve, the image keeps its width-driven
  height (414px of content width on a 520x360 logo wants 287px against 216px of room) and
  `overflow: hidden` cuts the difference off the bottom, which is exactly what it looked like.
  Replaced with an absolutely-inset box and `fill` + `objectFit: contain`. `contain` scales
  an image to fit entirely inside its box and centres it on both axes — it cannot clip and
  cannot sit off-centre by construction, rather than by a chain of resolved percentages. The
  inset box takes its size from the slide's padding box directly, so no percentage height is
  left anywhere in the chain. Checked that the classes reached the stylesheet first: they had,
  so the Tailwind-drops-arbitrary-values theory was ruled out rather than assumed.
  Marucci keeps `cover` — it is a photograph filling the frame, which is a different job.

- **"Public Page" in the portal nav, above Portfolio** (owner, 2026-08-24). Points at **`/`,
  not the absolute `https://savoycapital.io/`** the owner supplied: in production they are the
  same page, and a relative href cannot go stale against a domain change and will not send a
  preview or a local build off to production to show you the wrong build. Rendered as a plain
  `<a target="_blank" rel="noopener noreferrer">` rather than a `next/link` — prefetching and
  client-side swapping a link whose purpose is to LEAVE the portal is wrong, and without
  `noopener` the opened page gets a handle on this one via `window.opener`. A trailing glyph
  marks the jump before the click. It never lights up as active, correctly: the test is
  `pathname === href` and this leaves the app.

- **The TOTAL FUND row was left 104px right of every other row, and is now aligned**
  (owner, 2026-08-24). **A regression from the previous change, not a pre-existing defect.**
  Moving the View Details column from before the money to after the percentage moved the
  bucket rows' empty twin with it — but the total row's twin did not exist to move. Before,
  the twin sat *ahead* of the money and the label's `flex: 1` absorbed it, so every row's
  trailing cells still ended flush right and the total matched without carrying one. After,
  the twin pulls the bucket and holding rows 104px off the card's edge while the total stayed
  flush to it.
  The fix is the third twin. Every row in the table now carries one: holdings the real
  button, buckets and the total an empty span. Verified by counting them in the emitted HTML
  — seven, being three segment rows, three holdings and the total — and by confirming each
  legend row places money, share, then the slot.

- **Deal Room: delete a document, and the object-only delete that had to go with it**
  (owner, 2026-08-24: "add a way to delete files in the deal room").
  `DELETE /api/deals/<dealId>/documents/<docId>` removes the row **then** the object — the
  reverse of the upload's order, serving the same single rule: **never leave a row without
  its object.** An orphaned object is invisible and costs a fraction of a cent; a row whose
  View button 404s is a broken product with nothing left to say what the file was. If R2 is
  unconfigured or the object delete throws, the row still goes: refusing would keep a deleted
  document on screen over a variable that has nothing to do with it.
  **The find:** `/api/files/[...key]` still carried a `DELETE` from when R2 was the only
  store. Nothing called it, but every object under `management/funds/.../deals/...` now has a
  row, so it would have removed bytes and stranded the row — precisely the failure the upload
  route's own header calls unsurvivable. Removed, with GOTCHA 8c saying why adding one back
  is a bug: that route is addressed by object key, the one identifier that cannot find its
  row without a scan.
  The control asks first — two clicks, per-row, with the other actions replaced while armed
  so "Delete?" cannot be answered by clicking View. Neutral until armed, because a control
  that is already red reads as a warning about the row rather than about the action.
  **Not verified: nothing has been deleted anywhere.** No request has reached Postgres or R2
  from here.

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
