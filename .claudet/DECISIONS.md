# DECISIONS — savoycapital

Record real, load-bearing decisions here: **what + why + date.** The bar is "someone would
otherwise re-litigate this" — not every choice, just the ones that cost something to
reopen. Read the headers before working in an area.

Newest first.

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
