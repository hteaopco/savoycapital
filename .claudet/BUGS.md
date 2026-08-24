# BUGS — savoycapital

Known issues / follow-ups. **Open items only** — move an entry to `.claudet/archive/` when
it's resolved, so this file's listing is the actual open set.

Format per entry: symptom, root cause, why it recurs (if it does), and status. A bug whose
root cause is "nothing prevents this from happening again" stays OPEN even after the
instance is fixed — say what would close it.

---

- **OPEN — nothing detects `sign_up.mode` returning to `public`.**
  *Symptom:* none, ever, until a stranger is reading the fund's positions. Silent by
  construction.
  *Root cause:* the entire access boundary is one Clerk Dashboard toggle. No code in this
  repo reads it, and CI cannot — the check needs the live instance, not the tree.
  *Why it recurs:* it is a setting, not a state the repo owns. It was `public` on first
  setup (2026-08-24) and only a hand check caught it.
  *What would close it:* a scheduled job hitting the public environment endpoint and
  alerting when it stops reading `restricted`. `PLAYBOOKS/auth-clerk.md` GOTCHA 3 has the
  one-line curl it would run. Verified `restricted` by hand 2026-08-24.

- **OPEN — no automated check covers the auth boundary.**
  *Symptom:* `/portal` could become public and every gate would stay green.
  *Root cause:* `verify` runs typecheck, eslint and design-lint; none of them can see a
  route's protection, and the repo has no test runner.
  *Why it recurs:* the boundary lives in `src/proxy.ts`'s allowlist plus a Dashboard
  setting. A route-sweep test against a built server would catch the first half; only the
  job above catches the second.
  *What would close it:* an anonymous route sweep in CI asserting the public list 200s and
  everything else 307s. This seat runs that sweep by hand after every merge — last
  2026-08-24 after `#28`, clean.

- **UNKNOWN — `accounts.savoycapital.io` cannot be assessed from this seat.**
  *What is established:* the record **exists** — it resolves to Cloudflare IPs, and a control
  subdomain (`zzz-does-not-exist-9f3k.savoycapital.io`) does not resolve, so no wildcard is
  faking it. Automated requests to it get **HTTP 403 with `cf-mitigated: challenge`** —
  Cloudflare's bot challenge — with or without browser-like headers.
  *What is NOT established: whether anything is wrong with it.* A bot challenge is what
  Cloudflare serves to a datacenter IP regardless of which side is proxying, so it does not
  distinguish "proxied in our zone" (GOTCHA 8's fault) from "DNS-only, and Clerk's own
  Cloudflare is challenging the robot." **GOTCHA 8's actual signature — Error 1000, "DNS
  points to prohibited IP" — is NOT present**, which is evidence against the misconfiguration
  reading rather than for it.
  *Correction, recorded on purpose:* `STATE.md` and an earlier revision of this file asserted
  "still proxied, needs DNS-only." That inherited a claim from an earlier session and
  amplified it past what the evidence supports. It should not have been written as a finding.
  *Impact today: none observed.* The app never routes anyone to the hosted Account Portal —
  `src/proxy.ts` passes an explicit `unauthenticatedUrl` (GOTCHA 1) — and the owner signs in
  successfully. Clerk's `display_config.sign_in_url` does point there, so it would matter to
  anything following Clerk's hosted URLs.
  *What would settle it:* **a real browser.** Open `https://accounts.savoycapital.io` from a
  residential connection: Clerk's Account Portal means it is fine, Error 1000 means GOTCHA 8.
  No instrument this seat has can answer it — do not re-run curl and conclude anything.

- **OPEN (accepted, not a defect to fix) — signing out does not stop client-side navigation
  of already-visited portal pages.**
  *Symptom:* after Sign Out, previously-visited portal routes can still render from the
  browser's router cache in that tab.
  *Root cause:* every portal route is statically prerendered and prefetched by the sidebar
  links, so client-side navigation never reaches the server and `src/proxy.ts` never runs.
  Inherent to prerendering plus prefetch.
  *Scope:* same tab, same device, same person; ends at the next real request. Nothing is
  exposed to another person or device — verified by anonymous sweep.
  *Status:* recorded rather than fixed (`PLAYBOOKS/auth-clerk.md` GOTCHA 14). Listed here
  because it reads exactly like a broken boundary and will be re-reported otherwise.

**No open bugs outside the auth boundary are recorded here.** That is not a claim that none
exist — this file is hand-maintained and only the Clerk seat has audited it (2026-08-24).

## CLOSED 2026-08-24 (#46) — `maskComments` desyncs, so design-lint reads its own prose as a violation

**Symptom.** A comment that merely *names* a forbidden pattern is reported as a violation.
Hit on 2026-08-24: two comments explaining why money fields use a text input with a numeric
inputMode were flagged by `input-number`, while the code beneath them was correct.

**Root cause, measured not guessed.** `scripts/lib/mask-comments.mjs` is supposed to blank
comment bodies before any rule scans — its own header says "a rule that reads its own
explanatory prose as a violation is worse than no rule." It stops doing that partway through
a file. In `src/components/FundUsers.tsx` masking is correct up to roughly line 187 and
**every comment from ~line 188 onward is left unmasked**. Reproduce with:

```js
import { maskComments } from "./scripts/lib/mask-comments.mjs";
// compare maskComments(src) against src line by line; comment bodies stop being blanked
```

The masker skips string and template literals whole so a `//` inside one is not read as a
comment. Something in that skip runs past its terminator and swallows the comment markers
after it — the desync is consistent with an unbalanced quote or backtick being treated as a
literal opener.

**Why it stays open after the immediate fix.** The two comments were reworded to avoid the
literal, which is a workaround, not a fix: the next person to write "never use X" in a
comment near the bottom of a long component gets the same failure, and the natural reading is
that their *code* is wrong.

**Whose it is.** `scripts/design-lint.mjs` and `scripts/lib/` belong to the **design seat**.
`CLAUDE.md` names an agent editing its own gate as the change no gate can catch, so the coder
seat reported this rather than patching it.

**What would close it.** A fix in the masker plus a fixture that puts a forbidden literal
inside a comment late in a long file — `--self-test` currently has no case for prose that
names the pattern it forbids, which is why this shipped.

**Closed by #46** (mobile seat, 2026-08-24), which fixed the masker and added the fixture.
The root cause was narrower than the guess above: an interpolated template literal broke out
at `${` and never resumed, so the template's **closing** backtick was read as the **opening**
backtick of a new string. Quoted strings now also bail at a newline, so an apostrophe in JSX
prose (`don't`) cannot swallow the rest of a file. `DECISIONS.md` carries the full account.

**Verified from this seat rather than taken on trust**, because the reproduction above is
what filed it:
- The line-by-line comparison on `FundUsers.tsx` (837 lines) and `DealRoom.tsx` (1,425 lines)
  now reports **0 unmasked comment lines**. It previously desynced at roughly line 188 of the
  first.
- The exact original shape — an interpolated template, then `"don't"`, then a comment
  containing the literal this repo forbids — masks correctly, so the forbidden text no longer
  reaches a rule.
