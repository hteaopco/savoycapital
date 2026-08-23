# PLAYBOOKS/ — the technical bibles, one per subsystem

Operational runbooks: how a subsystem actually works, how to operate it, and the gotchas
that have bitten someone. One file per subsystem. These are where an agent grounds after
its charter.

A playbook is written **when a subsystem becomes operational enough to have a procedure** —
not in advance. Writing one for something unbuilt produces a document that describes an
intention, which is the failure mode this folder exists to avoid.

What belongs in one:

- how the thing works, at the level someone debugging it needs
- how to operate it: run it, verify it, recover it
- numbered **GOTCHAS** — each with the symptom, the cause, and the fix, so it can be cited
  by number from a bug entry or a decision
- what is deliberately *not* built, and why, where that would otherwise get re-proposed

_Empty. Nothing is operational yet._
