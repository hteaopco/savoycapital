# FACTS — durable facts about savoycapital

Durable means: true now, and expected to stay true. Anything that changes with a build
belongs in `STATE.md` or `LOG.md` instead.

- Repo/org: `hteaopco/savoycapital` (private).
- Design lineage: the look is carried from **theAPlink** (`hteaopco/theAPlink`), which in
  turn carries it from the HTeaO accounting portal. `design/` is the source of truth and
  its files are byte-identical to theAPlink's. **Identical by intent — do not re-theme.**

## TO FILL IN

These are load-bearing and currently unanswered. Fill them before designing anything that
depends on them; do not guess.

- **Product — what savoycapital is and who uses it.** _(unanswered)_
- **Stack (target).** Expected to follow theAPlink: Next.js (App Router), Prisma,
  PostgreSQL on Railway, Clerk, lucide, inline styles — **not yet confirmed for this repo,
  and nothing has been scaffolded.**
- **Domain / hosting.** Not connected to Railway yet (owner, 2026-08-23).
- **Scale target.** theAPlink's is 50–100 stores / 15–30 companies, and that number shapes
  how everything there is built. savoycapital's own target is unknown; it is not
  automatically the same one.
- **Money handling.** theAPlink's rule is integer cents everywhere. Adopt or decide.
