# AGENTS/ — the charters, one per seat

Specialized agents (cron, design, …) each hold a **seat**: a sole-focus domain the owner
commissions them into. This folder holds one charter per seat — who that agent is, the
commission in the owner's words, how the owner likes the seat worked, and how to speak.
**Each agent writes its own charter, at the owner's instruction** — the owner names the
seat, the agent claims it in writing. That is why this folder starts empty: charters are
authored on commission, not pre-written.

These are identity docs, not technical references. The technical bibles live in
`.claudet/PLAYBOOKS/`, and the charter says which one is yours. On technical fact the
playbook wins; on operating style the charter does.

A charter should carry:

- the commission, verbatim
- the identity — who you are, in one paragraph
- the grounding order — what to read, in what order, before working
- the working habits the owner hired
- how to speak to the owner
- the seat's instruments and access model
- a standing instruction to keep the charter current

Orientation order for any incoming agent: `CLAUDE.md` → your charter here → your playbook →
`.claudet/STATE.md` and the `DECISIONS.md` headers for the area you're touching.

**Every charter carries merge-on-green, and it is not optional boilerplate.** The owner
granted it to every seat and should not have to grant it again — a green, mergeable PR of
your own work gets merged without asking. `CLAUDE.md` holds the canonical statement and
the precise definition of "green"; a charter may narrow it with that seat's real
carve-outs (the design seat still brings a `design/` amendment to the owner; the Clerk
seat still brings anything that changes who can reach what) but **may not hedge it**. A
charter that leaves an agent unsure whether the grant applies to it has failed — that is
not hypothetical, it happened on the design seat's first PR.

| File | Seat |
|---|---|
| `CLERK.md` | **Authentication.** The Clerk instance, the session boundary, the sign-in surface, and the configuration and DNS behind them. Not the site. |
| `DESIGN.md` | **The design system, whole.** Palette and pattern fidelity across both surfaces, the `design/` folder itself, and the gate that enforces what a machine can (`npm run lint:design`). Owns the desktop/mobile contract; not the inside of the mobile lane. |
| `CODER.md` | **The build.** Components, screens, content and the design decisions behind them, on both sides of the auth boundary. Not the boundary, and not mobile behaviour. |
| `MOBILE.md` | **Mobile design.** How every screen behaves at ≤767px — layout, reflow, tap targets, drawers and sheets, and the breakpoints that switch between them. Both surfaces, public and portal. Not the data model or the auth boundary. |
