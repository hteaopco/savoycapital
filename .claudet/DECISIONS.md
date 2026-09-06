# DECISIONS — savoycapital

Record real, load-bearing decisions here: **what + why + date.** The bar is "someone would
otherwise re-litigate this" — not every choice, just the ones that cost something to
reopen. Read the headers before working in an area.

Newest first.

- **Mobile is audited at 375, 390 and 430 — not 375 alone (2026-08-25).** The canonical
  "look at it at 375px" from `MOBILE_REFERENCE.md` § 10 is necessary and **not sufficient**,
  proven by shipping a defect through it.
  - **What happened.** #51 added `overflowWrap: "anywhere"` to four user-entered names so a
    long token could not tear a row. On the Fund & Users row the name block is
    `min-w-0 flex-1`, i.e. flex-basis 0, sitting beside two selects with `minWidth` 150 and
    140. At a 390px viewport those selects plus their gaps take 314 of the row's ~316px and
    the name is left about **two pixels** — so `overflowWrap: anywhere` broke "Rodney Savoy"
    at every character, 165px tall, one letter per line. Reported from a real handset with a
    screenshot.
  - **Why every check passed.** `lint:mobile` was clean (nothing here is a `minWidth ≥ 300`,
    an unfloored control or a table), `verify` and `build` were green, and the width I audit —
    375 — is one of the widths where it does **not** reproduce. Measured across real devices:
    clean at 320 / 360 / 375, broken at **390 / 393 / 414 / 430**. That is every current
    iPhone and Pixel and none of the widths in the canon.
  - **The mechanism, stated so it is not re-learned.** 375 is the *tightest* common width,
    which makes it right for overflow. This bug is the opposite shape: it needs *enough* room
    for every fixed-width child to sit on one line, and only then does the flexible child get
    squeezed to nothing. A tighter viewport wraps the selects and hides it.
  - **`overflowWrap: "anywhere"` is only safe with a guaranteed width.** On a crushable flex
    item it converts a silent overflow into an unreadable column — worse than the bug it
    fixed. The repair keeps the wrap and adds `w-full md:w-auto`, because dropping the wrap
    would just restore a long-name tear.
  - **Not mechanized, deliberately.** A rule for "sum of sibling `minWidth`s exceeds the row"
    needs layout, not text — the gate would have to know the container's width, its padding
    and its gaps. Writing a fragile version would fire on honest code, which
    `MOBILE_REFERENCE.md` § 9 names as the way a ratchet loses its meaning. This one is held
    by measuring at more than one width, and that is now written into the charter and both
    mobile docs rather than left as a habit.

- **A connected panel shares its MOTION and never its GEOMETRY (2026-08-24).**
  `src/components/panel-motion.ts` holds the six timing and weight constants; each call site
  keeps its own offsets, widths and float breakpoint.
  - **Why share the motion.** The Deal Room's "Why We Like It" panel is the second of these.
    Left alone it would have been a second copy of four magic numbers on a second screen —
    `ui-governance.md` § 3's "two screens that disagree", which it names as permanently the
    reviewer's job because consistency is cross-file and the lint is per-file. Two connected
    panels that animate differently read as two mechanisms.
  - **Why NOT share the geometry.** The breakpoint is a *result*: Portfolio floats at `2xl:`
    because `240 + 64 + 780 + 98 + 320 = 1502`; the Deal Room floats at `min-[1640px]:` because
    its card is 900 wide and the sum is 1596. A shared constant here would make one screen's
    layout silently depend on the other's card width, and the failure — a panel hanging off the
    right edge — is invisible at every width except the one where it happens.
  - **The classes stay written out in full.** Tailwind scans source text, so a class assembled
    from a variable looks tidier and never reaches the stylesheet. Checked against the emitted
    CSS rather than the diff, which is the only way this is actually knowable.

- **The holding panel is a CHAIN, and the middle breakpoint is the whole design (2026-08-24).**
  `card ──── detail panel ──── Why We Like It`, on the owner's ask to have the thesis "off the
  card to the right ... the line on the right side of card and the why we like it box after
  that."
  - **Three layouts, not two.** ≥1860px the full chain; 1536–1860 the tray floats right of the
    card with the panels **stacked**; below 1536 it drops inline under the row. The middle state
    is not a compromise nobody wanted — it is what stops the change costing something. Pushing
    the whole tray out to 1860 would take the floating detail panel away from everyone between
    1536 and 1860 who has it today; letting the chain run at 1536 would hang the second panel
    off the right edge. A tray that is a flex **column** until it has room to be a flex **row**
    gets both, and needs no JavaScript to decide.
  - **1860 is arithmetic**: `240 + 64 + 780 + 98 + 320 + 72 + 280 = 1854`, six pixels of slack.
    The thesis panel is **280 and not 320 because that is what the sum had left** — if the
    chain should reach narrower screens, that is the number to spend and 1860 moves with it.
  - **This is a THIRD breakpoint on one component** (`md`, `2xl`, `min-[1860px]`), and
    `.claude/rules/ui-governance.md` § 4 says "a second is allowed above it when derived from
    arithmetic and shown at the call site." Both extras here are derived and shown, so the
    spirit holds — but the letter says *a second*, and amending that rule is an owner call, so
    it is flagged rather than edited.
  - **The second connector is a flex ITEM, the first is absolutely positioned.** Not an
    inconsistency: the first has to reach across a gap between two independent boxes, while the
    second only fills space inside a row that already exists. Making them the same would mean
    giving the second one absolute coordinates it does not need.

- **"Why We Like It" IS shown to investors — decided, then reversed the same day (2026-08-24).**
  Written in the Deal Room, read on the Portfolio drill-down.
  - **It shipped management-only first, and that was deliberate.** The reasoning then: a
    written investment thesis in front of investors is a different kind of statement from a
    note management keeps, so it should be asked for rather than arrive as a side effect of
    adding a column. The owner then asked for it — *"it needs to be on portfolio. its for the
    investors, a quick snippet of why we like it"* — which is the decision, and it stands.
  - **Recorded as a reversal rather than silently rewritten**, because the useful part is not
    which way it landed but that a disclosure question was put and answered by the person
    entitled to answer it. A future agent finding only the current state would have no way to
    tell a considered call from an unexamined default.
  - **The consequence the code now has to carry: the field is not a scratchpad.** Whatever is
    typed in the Deal Room is read by that fund's investors, with no draft state and no second
    copy. `src/lib/authz.ts` still scopes Portfolio by fund, so an investor sees their own
    fund's deals and no others — that is the only boundary around this text.
  - Rendered as **its own panel**, second in a chain off the card — *superseded the same day;
    it was briefly a `prose` detail row inside the first panel.* See the entry above.

- **The Portfolio chart reads Postgres. There is one source for a fund figure (2026-08-24).**
  `src/lib/portfolio.ts` builds it from `Fund.sizeCents` and each `Deal.amountCents`, grouped
  by `Deal.instrument`. `src/content/fund-allocation.ts` keeps only the as-of date.
  - **The reason is a reported bug, not tidiness.** Fund & Users could edit a fund size that
    Portfolio did not render, because Portfolio rendered a hard-coded copy. The owner saved a
    change and reported that nothing happened. Two sources for one figure always resolves
    this way; the only question is who finds out.
  - **What cannot be plotted is NAMED on the screen.** A deal without an amount or without an
    instrument appears in an amber line by name, saying what it needs. Dropping it would make
    the chart quietly disagree with the Deal Room — on a chart of a fund's money, a missing
    row is the failure to avoid, not a tidy one.
  - **Unallocated stays derived, and this is the load-bearing half.** `FundAllocation`
    computes it as fund size less everything deployed, so a split that does not add up cannot
    be drawn. `loadPortfolio` therefore returns buckets and a fund size and **never a total**.
    The figures this chart was first built from arrived $10,000 over; accepting a total as an
    input is how that ships.
  - **`FUND_AS_OF` stays a literal, deliberately.** It is the date of the marks, and there are
    no marks in the schema. `Fund.inceptionDate` and the latest investment date each answer a
    different question, so either would put a number under a label it does not answer. When
    positions and valuations land, this moves with them and not before.
  - **`terms` and `fees` are free text.** What an equity vs. debt position actually holds is
    still blocked on a person (`STATE.md`). A typed schema written now to look thorough is
    one the real schema would start by undoing; a text column feeding a text panel is not.

- **Dollar inputs group on blur, never per keystroke (2026-08-24).**
  Owner: *"use the comma separator..IE instead of 10000000 make it 10,000,000."* Grouping on
  every keystroke moves the caret mid-word, so typing a long figure fights back.
  `groupDollarInput` runs on `onBlur` and `centsToDollarInput` on load; anything that does not
  parse is returned **unchanged** rather than blanked or guessed at, because rewriting a field
  somebody is still working on is worse than leaving it, and the save path rejects it anyway
  with a message. `parseDollarsToCents` already stripped commas, so nothing on the wire moved.

- **`lint:mobile` is built, with five rules and two deliberate departures from theAPlink's
  (owner, 2026-08-24).** `scripts/mobile-lint.mjs`, baseline `{}`, wired into `npm run verify`
  and into CI with `--self-test` ahead of the gate. It closes the gap
  `.claude/rules/ui-governance.md` § 4 had been holding by review alone.
  - **Why now.** theAPlink accumulated 87 unadapted tables because every feature added one and
    nothing required a mobile answer in the same PR — a *process* gap, which is why periodic
    sweeps never fixed it for long. This repo has not accumulated that debt yet, so the gate
    costs nothing to adopt and prevents the cycle rather than cleaning up after it.
  - **`tap-target` is INVERTED from upstream's.** theAPlink floors `button` in `globals.css`
    and its rule therefore hunts sub-40px *non-buttons*. Here `globals.css` floors **form
    controls and not `button`** (so § 0.8's 36px carve-out survives), so the rule checks that a
    `<button>`/`<a>`/`<Link>` **states** a 44px floor. A clickable `<div>` is deliberately out
    of scope: a card-sized one and a 6px one are indistinguishable to a regex, and
    `ui-governance.md` § 6 already says so.
  - **`fixed-width` checks `minWidth` only, not `width`.** A numeric `width` collides with
    `next/image` intrinsic dimensions (`width: 520` in `RecentInvestments`'s data is a real
    image size). A rule that fires on honest code teaches that waivers are for false positives,
    which is the failure `MOBILE_REFERENCE.md` § 9 warns about. `maxWidth` is inherently safe
    on a phone and is not checked.
  - **`modal-width` is deliberately NOT built.** No modal exists here to exercise it against,
    and a rule that has never run on real code reads green forever. It goes in with the first
    modal. Same reasoning that keeps design-lint from having a `spacing-scale` rule.
  - **The cost, stated plainly.** Two gates now sit between a UI change and `main`, and both
    are owned by the seats they constrain — the arrangement `CLAUDE.md` flags as "the change no
    gate can catch". The mitigation is that each gate's rules are fixture-tested and the
    self-tests run in CI *before* the gates, so a rule that stops firing fails loudly.

- **The shared comment masker was under-masking after any interpolated template literal, and
  `design-lint` had the bug too (2026-08-24).** `scripts/lib/mask-comments.mjs` broke out of a
  template at `${` and never resumed, so the template's **closing** backtick was read as the
  **opening** backtick of a new string — and everything after it, to the next backtick or EOF,
  was skipped instead of masked.
  - **How it surfaced.** mobile-lint's `tap-target` rule fired on three *comments* that
    contain the words "`<button>`" and "`<a>`". The rule was right and the masker was wrong.
    `DealRoom.tsx` has ``border: `1px solid ${C.border}` `` in a style const near the top,
    which desynced everything below it.
  - **The direction of the failure matters:** it was UNDER-masking, so it produced false
    **positives**, never missed violations. `design-lint` was green only because none of its
    patterns happened to appear in an affected comment — a `#ffffff` written in prose after any
    interpolated template would have failed the build with nothing wrong in the code. Proven
    before fixing, not assumed.
  - **The fix** tracks open templates on a stack so an interpolation is scanned as code (a
    comment inside `${…}` is still masked) and the closing backtick pops instead of opening a
    phantom string. A quoted string now also bails at a newline, because a JS string literal
    cannot span one — without that, an apostrophe in JSX text (`don't`) opens a string that
    swallows real code. Both are covered by a fixture in mobile-lint's self-test.
  - **`scripts/lib/` is shared by both gates.** A change there moves what *either* gate can
    see, which is why it is now named in `CLAUDE.md`'s say-when-you-touch-it list.

- **The mobile tap-target floor is global for form controls and per-component for buttons
  (2026-08-24).** `src/app/globals.css` gains its first `@media (max-width: 767px)` block,
  flooring `input` / `select` / `textarea` to **44px**. `button` is deliberately **not** in it.
  - **Why a global block at all.** `design/MOBILE_REFERENCE.md` § 6 assumed one existed and
    told readers "you usually need no per-component work." It did not exist, so nothing was
    floored. Measured in Chromium at a 375px viewport before the fix: text input **37px**,
    date **39px**, select **34px**, one folder-edit input **28px** — every form control on the
    new Deal Room and Fund & Users screens was under the rule, and no lint, typecheck or build
    here would ever have said so.
  - **Why `button` is excluded, which is the load-bearing half.** § 0.8's carve-out lets a
    *spaced secondary* control sit at 36×36px (owner, 2026-08-23) and the carousel arrows ship
    at `h-9 w-9` on exactly that grant. A blanket `button { min-height: 44px }` would have
    silently overruled an owner decision — the failure mode where a global "fix" quietly
    deletes a considered exception. Buttons keep `min-h-[44px] md:min-h-0` at the call site,
    where the exception is readable. Verified after the change: arrows still measure 36px.
  - **44, not theAPlink's 40/42.** `DESIGN_SYSTEM.md` § 0.8 / § 9 put the floor at ≥44×44px;
    40 is upstream's own softening and did not carry here.
  - **The cost, stated plainly.** A global rule is invisible at the call site: a future
    component gets a 44px input without asking, and someone sizing a control tightly on
    purpose will be overridden without a diff to read. That is the trade for controls nobody
    has written yet being right by default. It is also why the exclusion list is narrow and
    documented rather than convenient.
  - **What is still floored by nothing:** a clickable `<div>` or `<span>`, and `<a>`. Those
    remain per-component, unchecked. A `lint:mobile` would catch them; it does not exist.

- **Role is enforced, and an empty roster opens the portal rather than closing it (2026-08-24).**
  The layer is `src/lib/authz.ts`, read by pages and route handlers.
  - **Not in `src/proxy.ts`, and not only because of ownership.** Middleware runs on the edge,
    where Prisma's driver adapter cannot go. It is also the right shape regardless: middleware
    deciding data-dependent authorization puts every route's rules somewhere the route cannot
    see. The proxy still answers "is somebody signed in" and nothing more.
  - **The bootstrap valve: ZERO assignments means everyone signed in is management.** Without
    it, the first deploy of this file locks the portal's owners out — a fail-closed check
    against an empty table denies everybody — and nothing in this repo can reach Railway's
    Postgres to undo it. It closes the moment one assignment exists, which it does. The
    Portfolio screen banners the state rather than leaving it silent.
    **The counterintuitive consequence, worth stating because it inverts the obvious reading:
    deleting every assignment UNLOCKS the app.** "Remove all the roles" sounds like lockdown
    and is the opposite.
  - **Once assignments exist, an unassigned account sees nothing.** That also narrows the
    sign-up-mode risk in `CLAUDE.md`: a stranger who signed up if the toggle flipped to
    `public` would land unassigned and reach no figures. A real improvement, and not a reason
    to relax about the toggle — it holds only while the table is non-empty.
  - **Hiding a nav link is not a control.** Every page and route guards itself; the nav filter
    exists so an investor is not shown destinations that bounce them. `isManagement` defaults
    to `true` so a forgetful caller shows more chrome, making the mistake visible rather than
    hiding a screen from someone.
  - **The Portfolio check is against the fund the CONTENT describes**, not a per-fund query.
    Positions and marks are still blocked on a person, so the figures are static content for
    fund 1; an investor on another fund is told there is no portfolio for it rather than shown
    fund 1's.

- **Clerk is the roster; this app stores only role and fund (owner, 2026-08-24).**
  > "lets make role actually work...can we just read users from clerk? or do i need to add
  > them here and send to clerk?"

  Read from Clerk. The `User` table shipped hours earlier — first name, last name, phone —
  is **dropped**, and `UserRole` replaces it: `clerkUserId`, `fundId`, `role`, nothing else.
  - **Why the first shape was wrong.** Two lists of people that nothing reconciles will
    disagree, and the one that gates sign-in is Clerk's. The other is decoration at best and
    a lie about who has access at worst. Every row on the Users tab is now a real account
    that can really sign in.
  - **Inviting from the app does not fit this instance, and that is a checked fact.**
    `createInvitation` takes `emailAddress` and has **no phone field** — read out of
    `@clerk/backend`'s types — while this instance identifies people by phone (auth-clerk
    GOTCHA 9). `users.createUser()` would work but mints an account rather than inviting one,
    which is a different decision and the Clerk seat's. Accounts stay Dashboard-invited.
  - **Keyed by `clerkUserId`, not phone.** Phone matching needs normalisation, and getting
    that wrong on the field that decides what somebody sees fails quietly and in the
    dangerous direction.
  - **The migration drops the table and migrates nothing.** None of the old data maps: the
    old rows key on a typed phone, the new ones on a Clerk account id the old table never
    held.

- **Enforcement ships AFTER the assignments exist, and an investor sees documents plus their
  fund's portfolio (owner, 2026-08-24).** Two calls, both put to the owner rather than taken.
  - **Scope.** An investor sees the investor-facing documents for their fund **and that
    fund's portfolio** — size, allocation, positions. Not the Deal Room, not
    management-facing files, not another fund. The middle option of three: narrower than
    read-only-everything, which would have handed the Deal Room to every investor.
  - **Sequencing.** This change collects assignments and enforces nothing. The alternative —
    one PR that both assigns and enforces — has a failure mode with no recovery path from
    here: if it deploys before the owner's own account has a row, a fail-closed check locks
    the portal's owners out, and a sandbox cannot reach Railway's Postgres to undo it.

- **The roster is a RECORD, not an access list, and the screen says so (owner, 2026-08-24).**
  "Fund & Users" adds `Fund.inceptionDate` and a `User` table — first name, last name, phone,
  fund, role. **None of it grants anything.**
  - **Why this needed deciding rather than just building.** A table of people beside a `Role`
    column is indistinguishable from a permissions system at a glance, and the failure it
    invites is silent: somebody removes a row, believes that person is out, and they are not.
    Access is still Clerk's restricted sign-up plus a Dashboard invitation — this table is read
    by nothing. The warning is repeated in the schema, in both API routes, **on the screen
    itself** and in `PLAYBOOKS/fund-users.md`, because a doc alone does not reach the person
    clicking Remove.
  - **`Role` mirrors `Audience`** (`MANAGEMENT` / `INVESTOR`) so the eventual authorization
    layer has a column to read and the two vocabularies agree. Today the two values carry
    identical power.
  - **`phone` is unique and stored exactly as typed.** It is the join to a Clerk identity —
    that instance identifies people by phone, not email — so two rows on one number cannot
    both be that account. No normalisation: guessing a country code wrong on the one field
    that has to match Clerk is worse than storing what was entered.
  - **`inceptionDate` is nullable.** Fund 1 predates the column and this repo may not invent a
    fund figure; a default would have written a date nobody supplied onto the fund every deal
    belongs to. A `DATE`, not a timestamp, so a timezone cannot move it across midnight.
  - **No fund delete.** `Deal.fundId` and `User.fundId` are both `Restrict`, so it would fail
    at the database; a button that cannot work is worse than none.

- **The Deal Room brings Postgres, and deals carry a `fundId` (owner, 2026-08-24).**
  > "Add a database" · "FundID - will denote the fund (if we grow later) / DealID - deal
  > within the fund ... investors would be identified by fundID, and they would have access
  > to all the deal info within the fundID" · "every deal id right now = fundid 1"

  - **A database, chosen over the cheaper option and knowingly.** The seat's recommendation
    was a sidecar manifest in R2 — no new infrastructure for what is, today, a deal name and
    a description per file. The owner chose Postgres anyway. Recording that the trade was
    stated and overruled, not missed: this is the right long-term home for deals, positions
    and marks, and the cost is a second store to keep alive.
  - **`Fund` is one column, and is NOT theAPlink's multi-tenancy.** `FACTS.md` says this is
    one fund and that "what does adding client #27 cost?" is the wrong question here. A fund
    id is carried anyway because **it is the authorization boundary for investors** — the
    thing the product does not have and will need — and because retrofitting it onto object
    keys that already exist is the expensive version of this change. No tenancy extension, no
    per-model scoping, no ratchet. Do not grow it into one.
  - **Deal ids are sequential integers, not cuids.** The owner asked for "a deal id we can
    pull from later and work off of". Enumerable ids are acceptable because every route
    serving one is behind Clerk and the eventual investor check is on `fundId`, not on the
    difficulty of guessing a deal number.
  - **Both stores are OPTIONAL to build and boot**, matching how R2 was already wired.
    `DATABASE_URL` absent → the deal routes answer 503 and every other page serves. This is
    load-bearing twice over: CI builds with no secrets, and an ungated `prisma migrate deploy`
    in the start command would take the **public landing page** down over a database it does
    not use.
  - **Investor-facing upload is refused at the API, not merely disabled in the UI.** Nothing
    serves the `investors/` prefix, so accepting one would write a file readable by nobody
    on a screen that looks like investors have access. The audience becomes an input the day
    the authorization layer lands.

- **Accounts are created directly in Clerk, not invited; and an SMS code stays the only
  sign-in factor (owner, 2026-08-24).**
  > "we will not invite users for now. i will just create them inside clerk... easier just to
  > create the accounts by phone and name, no pw, and let them login once account is created"
  >
  > "simplicity over security until sensitive info arrives"

  - **Direct creation does not move the boundary.** The property that matters is whether a
    *stranger* can cause an account to exist. `sign_up.mode: restricted` answers no, and it
    does not care which admin gesture created the account — invitation and Dashboard creation
    are equivalent under it. The docs previously said an account "cannot exist unless a
    principal **invited** it," which this made false; `PLAYBOOKS/auth-clerk.md` § 1 and
    `.env.example` are corrected, and `/sign-in`'s copy no longer says "by invitation."
  - **What would move it: flipping `sign_up.mode` to `public`.** Direct creation works fine
    under `restricted`, so there is never a reason to. That flip is the silent failure in
    GOTCHA 3 and it is the whole access boundary.
  - **"No password" was already true.** Verified on the live instance the same day:
    `password.enabled: false`, `first_factors: ["phone_code", "ticket"]`. Nothing was
    changed to enable this — it is the instance's existing shape, so the decision costs
    nothing to implement and there is no password affordance to build.
  - **The cost, recorded once so it is not rediscovered as a surprise.** An SMS code is the
    sole factor, so whoever controls the phone number reaches everything behind the gate.
    Clerk's 2FA would add nothing today — the only second factor available is `phone_code`,
    the same channel. A real second factor means enabling `authenticator_app` (Dashboard,
    owner call).
  - **The stated trigger — "until sensitive info arrives" — deserves a flag, not a
    re-litigation.** The owner made this call in "build mode," and the seat's read is that
    the trigger has arguably already fired: `/portal/portfolio` serves a $10M fund size,
    named positions with amounts, and deal terms today, and `#26` put the management document
    store behind the same single gate. **The decision stands as the owner's** — it is
    defensible for two principals on a boundary that has been verified holding. This bullet
    exists so the next agent re-reads the trigger against what the portal actually serves
    rather than assuming the surface is still empty.

- **The document store is Cloudflare R2, management-only, with bytes served through the app
  (owner, 2026-08-24).** The owner created the bucket and asked what it needed. Four calls
  were made; these are the ones someone would otherwise re-litigate.
  - **Management-only, and investors are a separate decision.** Asked rather than assumed,
    because "files for investors and management" collides with the model this app rests on:
    `src/proxy.ts` asks only whether somebody is signed in, and there is deliberately no
    authorization layer behind it. Give investors Clerk accounts under that model and every
    investor reaches `/portal/portfolio` — fund size, every position, every amount — plus
    every other investor's documents. Owner chose management-only for now. **`PREFIX.investors`
    is reserved and no route reads it**, so the eventual authorization layer lands without
    rewriting keys that already exist.
  - **Bytes stream through a route handler; no presigned URLs.** A presigned URL is valid for
    its whole TTL to whoever holds it — browser history, a forwarded link, a referrer header.
    A handler that re-checks the session every request leaves nothing that outlives the
    request, and **the bucket needs no CORS policy at all** because the browser never talks to
    R2 directly. The cost is our bandwidth, which at this volume is nothing.
  - **The privacy boundary is two dashboard toggles, not this code.** The bucket's **Public
    Development URL** and **Custom Domain** are what make it private by being off. Either one
    enabled makes every object world-readable at a guessable URL with no auth and no expiry,
    and nothing in this repo will notice. Same shape as the sign-up-mode risk in `CLAUDE.md`,
    one layer down. `PLAYBOOKS/storage-r2.md` GOTCHA 1.
  - **The endpoint is derived, and the client is built lazily.** Derived from `R2_ACCOUNT_ID`
    rather than stored as a fifth variable, so two copies cannot disagree. Lazy because CI
    runs `next build` with no secrets on purpose — a module-scope `new S3Client()` reading
    absent env vars would make the build need a secret, which is precisely what that setup
    exists to catch. Unconfigured, the file routes answer 503 and every other page is
    unaffected.

- **The carousel dots stay 24×44 on touch; they do not go to 44×44 (owner, 2026-08-24).**
  > "Leave them."

  The first mobile sweep (#23) found the dot buttons at 6px tall — the only control on either
  surface that failed the tap-target floor outright — and floored the **height** to 44px. The
  remaining question, put to the owner rather than decided in the seat, was whether to also
  widen them to a full 44. The answer is no.
  - **Why it was a question at all.** `DESIGN_SYSTEM.md` § 0.8 / § 9 put a ≥44×**44** floor on
    "every interactive element a thumb hits", and the 36px carve-out does not cover these —
    they are repeated in a row, which the carve-out explicitly excludes. So 24 wide is below
    the stated floor and the deviation needed a person, not a rationalization.
  - **Why the answer is defensible.** 24×44 clears **WCAG 2.2 AA (2.5.8), whose minimum is
    24×24**. It fails the AAA/HIG comfort standard of 44, exactly as the repo's other
    documented tap-target exception does. The cost lands on touch users first, and it is a
    trade the owner made with that stated.
  - **What it cost to widen, which is why it was declined.** Three dots plus two flanking
    arrows at 44 each visibly spreads the row and pushes the arrows apart — a real change to a
    surface the owner has already signed off, in exchange for width on a control whose
    *height* was the actual defect.
  - **This is settled. Do not re-raise it.** A later sweep will measure 24px against a 44px
    floor and read it as a finding; it is not one. The call site says so too, at the point
    where an agent would be tempted to "fix" it.

- **The three `AP_DESIGN_REFERENCE.md` contradictions are resolved toward `DESIGN_SYSTEM.md`,
  and the code now matches (owner, 2026-08-24: "Fix everything").** The file labelled **READ
  FIRST** told every incoming agent the opposite of what ships, on three counts. Each now
  carries a banner row and a row in `design/README.md`'s table; `design/` is four-tenths
  divergent from theAPlink rather than three-tenths, and that cost is accepted for the same
  reason as last time — the alternative is a doc that instructs agents to undo working code.
  - **Tailwind is how spacing and sizing are written.** AP § 2 said "never for
    color/**spacing**/theming"; `DESIGN_SYSTEM.md` § 4 *forbids* inline responsive spacing,
    because an inline value cannot honour a breakpoint. The theming half survives whole, and
    the app has **zero** Tailwind color classes.
  - **Cards and panels are radius 12, not 10.** `FundAllocation`'s card and its terms panel
    moved 10 → 12, matching `RecentInvestments`. 10 stays correct for the dashed empty state.
  - **Badges are radius 4, not 8.** The portal's "% DEPLOYED" pill moved 8 → 4, matching the
    public page's tags.

- **A badge's tone encodes STATE, never category (design seat, 2026-08-24).** `C.green` meant
  "Private Credit" in the portal's chart and "Current" on the public page, and the public
  page's instrument badge was accent-tinted — which § 4 forbids as decorative use of the
  primary-action color. Every rule passed; it was only visible to a person reading both
  screens. **The instrument badge is now neutral on both surfaces, green is reserved for the
  positive state, and accent appears once per card as an active-state readout.** The donut
  keeps accent/green as **arc identity**, which is a separate vocabulary — `DESIGN_SYSTEM.md`
  has no chart words at all, and its legend chips mirror arcs rather than badging anything.

- **There is deliberately NO `spacing-scale` lint rule, and off-scale component padding is not
  a finding (design seat, 2026-08-24).** `DESIGN_SYSTEM.md` § 2 lists `4, 6, 8, 10, 12, 16,
  20, 24` and says anything else needs a written exception — but § 3's **own primitives** ship
  `padding: "10px 14px"` and `"48px 16px"`. **The canon does not hold itself to that scale for
  component-internal padding.** The first audit pass read nine "violations" off that scale;
  measuring the canon showed they were nothing of the kind, and a rule enforcing it would have
  failed honest code and pushed agents to re-theme working components. Treat § 2 as layout
  rhythm. `radius-scale` and `inline-svg` **were** added — those two the canon does hold.

- **Tap targets are fixed on TOUCH only; desktop stays byte-identical (design seat,
  2026-08-24).** The carousel dots were 6px tall and 8px apart — under § 7's floor, under WCAG
  2.2 AA's 24×24, and not rescued by the spacing exception. `SiteNav`'s only action was ~32px,
  below even the 36px carve-out, which would not have applied anyway since that one is for a
  *secondary* control. All three now use this repo's established pattern —
  `min-h-[44px] md:min-h-0`, with the dots also taking 9px of transparent horizontal padding
  on touch and the row's gap collapsed to 0 so the spacing is unchanged. **A pointer is not a
  thumb**, so no desktop pixel moved. The carousel arrows stay at 36 — they are the case § 7's
  carve-out was written for.

- **The mobile drawer closes on Esc and returns focus; it is still not a focus trap (design
  seat, 2026-08-24).** § 7 asks that every modal close on Esc, and the drawer is a modal — it
  covers the page and takes the tap. A scrim dismissible only by tapping is unusable from a
  keyboard. Focus returns to the menu button, without which dismissing drops focus to `<body>`
  and the next Tab restarts from the top of the document. **A real trap needs a sentinel pair
  and a scroll lock and belongs with the mobile seat's drawer work** — named here so the gap
  is known rather than an oversight.

- **Merge-on-green is house-level standing authorization, stated in `CLAUDE.md`, and no
  charter may hedge it (owner, 2026-08-24).**

  > "you have a standing order to merge on green...make sure claude md has merge on green
  > auto and every charter has merge on green auto"

  - **A root `CLAUDE.md` now exists.** There was none — `.claude/rules/` and `scripts/` were
    scaffolded empty in `a0c5e46` and nothing at the root pointed at either, so
    `ui-governance.md` shipped with a banner admitting it was not reachable. `CLAUDE.md` is
    now the one file every agent carries: the merge grant, the seats table, the verify
    chain, the two rules that override convenience, and **pointers** to `.claudet/`,
    `.claude/rules/` and `design/`. It deliberately repeats nothing from them — a second
    copy is a copy that goes stale.
  - **What "green" means lives in exactly one place now.** `conclusion: success` **and**
    `mergeable_state: clean`, re-fetch `origin/main` first, your own PRs only. Three
    charters each carried their own paraphrase; they now point at the canonical one.
  - **The failure this fixes is over-caution, not recklessness.** The design seat held a
    green, clean PR (#20) and asked instead — reasoning that a CI gate was "governance, not
    a pixel," and that leaning on a merge clause it had authored for itself an hour earlier
    was bootstrapping its own authority. Both halves were wrong: the grant came from the
    owner and predates the charter, which only records it. **Deference that makes the owner
    repeat himself costs him a turn exactly as much as carelessness does.** `DESIGN.md` now
    carries that as a named failure mode rather than a general instruction to be bold.
  - **Charters may narrow, never hedge.** The real carve-outs stand and are per-seat: a
    `design/` amendment or design-intent call (design seat), anything changing who can reach
    what (Clerk seat), anything widening public exposure of the fund's numbers.

- **`design-lint` landing falsified nine written claims, and they were corrected in the same
  PR (design seat, 2026-08-24).** `design/MOBILE_REFERENCE.md`, `MOBILE_AUDIT_PLAYBOOK.md`,
  `design/README.md`, `AGENTS/MOBILE.md` and `STATE.md` all said `npm run verify` was
  "typecheck + lint" and that `scripts/` was empty; `design/README.md` had a whole section
  titled "Mirrors — not yet enforced". All true when written, all false the moment #20
  merged.
  - This is the rule the mobile amendment wrote down for itself — *anyone building the
    missing machinery falsifies a row in those banners and must update them in the same PR*
    — applied for the first time. It was missed on #20 and caught on the next pass.
  - **The mirror row is now three rows with three different answers**, because only one of
    the three pairs is a real pair: `palette.ts` is hard-gated, `globals-reset-snippet.css`
    is a *deliberate* partial port that a byte gate would be wrong to enforce, and
    `inter-fonts.ts` has no app copy because nothing generates PDFs. Collapsing those into
    one "not yet enforced" line hid two different reasons behind one word.

- **The design seat is commissioned, and design fidelity is now gated rather than trusted
  (owner, 2026-08-24).** `npm run lint:design` runs in `verify` and therefore in CI on every
  PR: nine ratcheted rules at a baseline of `{}`, plus a **hard, baseline-free mirror gate**
  on `design/palette.ts` ↔ `src/components/palette.ts`. Before this, nothing in the repo
  checked a single design rule — `verify` was typecheck + eslint, and "we follow `design/`"
  was a claim with no way to fail.
  - **The baseline is `{}` and stays `{}`.** Every rule sits at zero today, so the next
    violation fails the build — that is the whole value. A genuine exception is waived at
    the call site with a reason (`// design-ok:`), never by re-growing the baseline.
  - **The rules were chosen so the baseline could be zero without touching a UI file.** Jett
    owns the UI (`DESIGN_SYSTEM.md` § 1) and a design seat is exactly the seat that could
    smuggle a pixel change through under a tooling PR. Rules that would have needed one —
    `inline-svg` (wants a `design-ok:` line in `FundAllocation.tsx`) and the off-scale value
    rules — were left out and are named as open in `ui-governance.md` § 6.
  - **`--self-test` runs in CI ahead of the gate.** A rule with a broken regex reads green
    forever, which is worse than no rule. Each of the ten was also mutation-probed against
    the real repo — break the mirror, plant a hex, plant a theming class, plant a `sm:`,
    delete the one real waiver — and confirmed to go red.
  - **What it does NOT prove, stated up front:** it proves tokens and mechanisms, never
    values. `C.overlay` used as a shadow passes. Off-scale spacing passes. Two cards at
    different radii pass. `ui-governance.md` § 3 lists that residue as permanently a
    reviewer's job so a green run is never mistaken for a review.
  - **What would reopen this:** an off-scale rule becomes writable the day the scale
    contradictions inside `design/` are resolved (see the next entry).

- **`design/AP_DESIGN_REFERENCE.md` and `design/DESIGN_SYSTEM.md` contradict each other on
  three points, and the code silently follows different files for different ones (found by
  the design seat, 2026-08-24; unresolved, owner's call).** Both were carried from theAPlink,
  where the same conflicts presumably existed harmlessly. Here the "READ FIRST" file tells a
  new agent the opposite of what ships:
  - **Tailwind for spacing.** `AP_DESIGN_REFERENCE.md` § 2: Tailwind "never for
    color/spacing/theming". `DESIGN_SYSTEM.md` § 4: responsive spacing **must** be Tailwind
    utilities, because an inline value cannot honour a breakpoint. The app follows
    DESIGN_SYSTEM — ~40 spacing/sizing classes, and it could not be mobile-first otherwise.
    The *color* half of § 2 is held perfectly: **zero** Tailwind color classes anywhere.
  - **Radius for a card.** AP: 10 = cards/panels, 12 = modals. DESIGN_SYSTEM: 10 = larger
    buttons and dashed empty cards, 12 = cards/panels. Both are shipping —
    `RecentInvestments`'s card is 12, `FundAllocation`'s is 10.
  - **Radius for a badge.** AP: status pill = 8. DESIGN_SYSTEM § 4: "Circular / pill badges
    — always rectangle `borderRadius: 4`." Both are shipping — the public tags are 4, the
    portal's "% DEPLOYED" pill is 8.

  The 2026-08-24 precedent says **`DESIGN_SYSTEM.md` wins** and the losing file gets a
  banner plus a row in `design/README.md`'s divergence table. Applying it here would make
  `design/` four-tenths divergent and would change shipped pixels on two cards and one
  badge, so it is left as an owner call rather than taken by the seat.

- **The mobile docs are amended to describe this repo, and `DESIGN_SYSTEM.md` wins where the
  carried docs disagree (owner, 2026-08-24).** `design/MOBILE_REFERENCE.md` and
  `design/MOBILE_AUDIT_PLAYBOOK.md` were carried byte-for-byte from theAPlink and described a
  mobile surface this product does not have. Each now carries a divergence banner, and
  `design/README.md`'s table names every change. Three conflicts, resolved the same way each
  time — **toward `DESIGN_SYSTEM.md`, because the code had already resolved them that way:**
  - **Posture: mobile-first, not frozen-desktop.** `MOBILE_REFERENCE.md` treats desktop as
    frozen and mobile as an additive layer; `DESIGN_SYSTEM.md` § 1.1 says "every component is
    designed at 375px first." The freeze is a **remediation** stance — theAPlink adopted it
    after accumulating 87 unadapted tables, to keep a mobile retrofit from disturbing a large
    existing surface. **Nothing here is frozen, and importing that stance would license
    building desktop-first and bolting mobile on, which is how that backlog was created.**
  - **Breakpoints: `md:` is primary, a second is allowed when derived.** `MOBILE_REFERENCE.md`
    § 1 permits exactly one and says lint rejects any other. `DESIGN_SYSTEM.md` § 3.x uses
    `sm:`/`lg:` throughout, and `FundAllocation.tsx` already ships `2xl:` off a documented
    sum (1502 required, 1536 available). The condition is that a second breakpoint be **derived from arithmetic and
    shown at the call site**, and never reach below 768px.
  - **Tap targets: 44px, per component.** `MOBILE_REFERENCE.md` § 6 says `globals.css` floors
    controls to 40px so "you usually need no per-component work." **`src/app/globals.css` has
    no `@media (max-width:767px)` block at all**, and `DESIGN_SYSTEM.md` § 0.8 / § 9 say ≥44.
    So the floor is 44 and it is written at each call site as `min-h-[44px] md:min-h-0`.
  - **Why amend rather than override in the charter.** The charter already recorded the
    resolution, but a resolution living only in an agent's identity doc leaves `design/`
    quietly contradicting the code — the same failure mode the 400ms crossfade decision
    legislated against. Changing the rule where the rule lives is the honest version.
  - **The cost, stated plainly: `design/` is now three-tenths divergent rather than
    one-tenth.** That erodes the property the folder exists for — being checkably the same
    look as theAPlink. It is accepted because the alternative is worse: two documents that
    instruct an agent to protect a frozen desktop that does not exist and to rely on a lint,
    a hook and a primitives library that do not exist either. **Patterns and vocabulary were
    kept verbatim; only claims about *this repo* were corrected.**
  - **A related overstatement was fixed in the same pass.** `design/README.md` said the
    carried files were identical "verified by checksum." There is **no theAPlink checkout here
    to checksum against**, so that was never computable — it is a convention held by hand, and
    now says so (`.claudet/README.md` rule 3).
  - **What would reopen this:** building any of the missing machinery. A `useIsMobile()` hook,
    `mobile-cards.tsx`, a `@media (max-width:767px)` block, or `lint:mobile` each falsify a
    row in the banners the day it lands. **Update the banner in the same PR as the machinery.**

- **Merge-on-green is standing authorization for the mobile seat (owner, 2026-08-24).**
  Required checks green, mergeable, no change-requested review — the seat merges without
  asking, each time. It is bounded by what it does not cover, which is the part worth
  remembering: **a `design/` amendment and a design-intent call still come to the owner.**
  Merge authority is about not stalling on reversible presentational work, not about widening
  what the seat may decide alone.
- **Light only. There is no theme toggle and no dark theme (owner, 2026-08-24).**
  > "no theme needed, light only"

  `design/palette.ts` was already a **forced-light** palette that opts out of the dark theme
  tokens — this makes the product decision match the palette's, rather than leaving the
  palette looking like an accident someone should fix.
  - **Why this needs recording at all.** theAPlink's sidebar — the one the Investor Portal's
    nav was copied from — carries a moon toggle next to Sign Out, and it was in the very
    screenshot this portal's shell was built from. Anyone working from that reference will
    see a missing control and be tempted to add it. It is not missing; it is declined.
  - **What it forbids:** a toggle that does nothing, a `prefers-color-scheme` block that
    quietly re-themes the app, and any second set of palette tokens. `C` is the palette, in
    one mode.
  - **What it does not forbid:** honouring `prefers-reduced-motion`, which is an
    accessibility signal and unrelated to colour.

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
  - **SUPERSEDED on the link only, 2026-08-24.** That change has since happened: the nav
    reads **"Investor Portal" → `/portal`**, and because `/portal` is protected the login is
    already discoverable via the 307 to `/sign-in`. `/coming-soon` is orphaned. The rest of
    this entry stands unchanged — there is still no `/sign-up` route, and `<ClerkProvider>`
    still carries no `signUpUrl`. Left in place rather than rewritten because this file is
    the record of what was decided when.

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
