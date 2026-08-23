# scoping/ — plans queued for a build

Scoping docs for work the owner has reviewed and intends to build: the design is settled
enough to start from, but no code exists yet. One file per build — though a few stay past
their build because they hold something live (a gate, a named remainder, a design
authority); the Status column says which.

**Presence in this directory is not permission to build.** The Status column is the
authority — a doc can sit here parked, gated on an owner call, or deliberately timed for
later. Read it before starting.

Lifecycle: drafted in review → owner says it's getting built → lands here → the
implementing agent grounds on it, keeps it updated as reality diverges, and on completion
either moves the durable parts into a playbook, or stamps it DONE with pointers to what
shipped. **Once a stamped doc carries nothing live — no gate, no named remainder, no
unbuilt PR — it moves to `archive/`**, so this folder's listing is the actual queue and a
grep hit under `archive/` announces itself as history.

| Doc | Status |
|---|---|
| _(none yet)_ | Queue is empty. |
