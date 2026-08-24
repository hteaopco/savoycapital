# PLAYBOOK — Fund & Users

The roster: funds, and the people recorded against them.

Subsystem status: **built, and it grants nothing.** Read § 1 before assuming otherwise.

---

## 1. This is a RECORD, not an account. Read this first.

**Creating a user here does not create a Clerk account, does not send an invitation, and
does not let anyone sign in. Deleting one does not revoke anything.**

Access is what it has always been: the Clerk instance is set to **restricted sign-up**, so an
account cannot exist unless a principal invited it from the Clerk Dashboard. That setting is
the boundary — `PLAYBOOKS/auth-clerk.md` § 1. This table sits beside it and is read by
nothing.

**`Role` is stored and enforced nowhere.** It mirrors `Audience` so the eventual
authorization layer has a column to read. Until that layer exists, a `MANAGEMENT` row and an
`INVESTOR` row carry identical power: whatever their Clerk account has, which is everything
behind the sign-in.

Why this warning is repeated in the schema, in both API routes, on the screen itself and
here: **a table of people with a Role column is indistinguishable from a permissions system
at a glance.** The failure it invites is silent — somebody removes a row, believes the person
is out, and they are not. A doc alone would not stop that, which is why the screen says it
too.

### What would make it real

An authorization layer that reads this table, keyed by the Clerk identity. The join is
**phone**: the instance identifies people by phone, not email (auth-clerk GOTCHA 9), which is
why `User.phone` is unique. Nothing implements that join yet.

---

## 2. Shape

| Model | Holds |
|---|---|
| `Fund` | `name`, optional `inceptionDate` (a `DATE`), its deals and users |
| `User` | `firstName`, `lastName`, unique `phone`, `fundId`, `role`, `createdBy` |

`Fund → User` is `onDelete: Restrict`, same as `Fund → Deal`. A fund with anything attached
cannot be deleted, which is why **there is no fund delete route** — it would fail at the
database and a button that cannot work is worse than none.

**`inceptionDate` is nullable on purpose.** Fund 1 predates the column, and this repo may not
invent a fund figure — an inception date is one. A default would have written a date nobody
supplied onto the fund every deal belongs to. It is a `DATE`, not a timestamp: an inception
is a calendar day, and a time component invites a timezone to move it across midnight.

### Routes

```
GET  /api/funds          list, with per-fund user and deal counts
POST /api/funds          { name, inceptionDate? }
GET  /api/users          list, with the fund name
POST /api/users          { firstName, lastName, phone, fundId, role }
DELETE /api/users/<id>   remove a row — revokes nothing
```

All protected by absence from `src/proxy.ts`'s public list, with an explicit `auth()` in each
handler. Do not add any of them to that list: `/api/users` returns phone numbers.

---

## 3. GOTCHAS

**GOTCHA 1 — the roster is not the access list.** § 1. The single most likely wrong
assumption about this subsystem, and the only one whose failure is silent.

**GOTCHA 2 — `phone` is unique, and stored exactly as typed.**
No normalisation, so `+1 555 000 1111` and `5550001111` are two different rows and only one
can exist per string. That is deliberate: normalising would guess a country code, and guessing
wrong on the one field that has to match a Clerk identity is worse than storing what was
entered. A collision answers **409** naming whose number it already is, checked before the
insert *and* caught after it — the check can lose a race, the catch cannot.

**GOTCHA 3 — a `DATE` column read as a `Date` is UTC midnight.**
`toLocaleDateString()` in a timezone west of UTC renders it as the previous day. Both the
route and the page slice `toISOString()` instead, which keeps the calendar day that was
entered. If a date ever displays a day early, this is why.

**GOTCHA 4 — no edit route.** Users can be added and removed, not amended. The field most
likely to need it is `phone`, which is also the unique one, so a PATCH owes the same
collision handling `POST` has. Delete and re-add covers it until then.

**GOTCHA 5 — `/fund-users` is `force-dynamic`, and needs to be.**
It queries Postgres in a server component. Without it Next tries to prerender at build time
and CI builds with no `DATABASE_URL`.

**GOTCHA 6 — both lists are PROPS, not mount fetches.**
React 19's `react-hooks/set-state-in-effect` rejects a state update driven by an effect on
mount. Re-adding a `useEffect` that fetches will fail `npm run lint`.

---

## 4. Deliberately not built

- **Anything that turns a row into access.** § 1.
- **Editing a user, renaming a fund, deleting a fund.** Create and remove only.
- **Inviting from this screen.** It would need a Clerk backend call and a decision about who
  may invite; that is the Clerk seat's surface, not this one's.
- **More than two roles.** `MANAGEMENT` and `INVESTOR` mirror `Audience` so the two agree.
  A third is a migration and a conversation about what it would mean.
