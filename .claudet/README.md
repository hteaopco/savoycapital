# .claudet/ — working memory

The project's durable memory, kept in git so it survives any one session. Convention
carried from theAPlink. Read the file that matches your question; write to the file that
matches what you learned.

| File | Holds | Write when |
|---|---|---|
| `FACTS.md` | Durable facts about the product — what it is, the stack, the constraints that bind every design. | A fact becomes true and stays true. |
| `DECISIONS.md` | Settled, load-bearing calls: what + why + date. | A decision is made that someone would otherwise re-litigate. |
| `STATE.md` | What is genuinely mid-flight or blocked on a person. Short. | The answer to "where are we" actually changes. |
| `BUGS.md` | Known defects and follow-ups, open only. | A defect is found, or an open one is resolved (move it to `archive/`). |
| `LOG.md` | Reverse-chronological record of notable changes. | Something notable ships. |
| `AGENTS/` | One charter per seat — who an agent is and what it was commissioned to do. | An agent is commissioned into a seat. |
| `PLAYBOOKS/` | Operational runbooks and the gotchas that go with them. | A subsystem gets operational enough to have a procedure. |
| `scoping/` | Plans the owner has reviewed and intends to build, one file per build. | A design is settled enough to start from. |
| `archive/` | Dated snapshots and resolved records. Nothing here is live. | Something stops being live but is worth keeping. |

## The rules that make it work

1. **Never hand-write a number a script can count.** Inventories (model / route / feature
   counts) rot between the audits that were supposed to refresh them. theAPlink learned
   this the hard way and moved its inventory to a generator and its change history to git.
   Until this repo has those scripts, keep counts out of these files rather than writing
   ones that will go stale.
2. **Presence in `scoping/` is not permission to build.** The Status column says what is
   authorized; a file sitting there can be parked, gated, or waiting on an owner call.
3. **Don't assert an enforcement that doesn't execute.** A doc claiming "X is checked" when
   nothing checks X is a lie the next reader will act on. Say "convention, held by hand."
4. **Archive rather than delete.** Move finished work to `archive/`; the path itself is the
   signal to a grep hit that it's reading history.
