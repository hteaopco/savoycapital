# PLAYBOOK — Fund & Users

The roster: funds, and the people recorded against them.

Subsystem status: **built, and enforced as of 2026-08-24.** Read § 1a for what a role now decides,
and the bootstrap valve that keeps an empty table from locking everyone out.

---

## 1. Clerk is the roster. This app stores only role and fund.

Owner, 2026-08-24: *"can we just read users from clerk?"* — **yes, and that is what it
does.** The Users tab lists real Clerk accounts via `clerkClient().users.getUserList()`.
Names and phone numbers are read live; nothing about a person is duplicated here.

The first version kept its own `User` table — first name, last name, phone — and it was the
wrong shape. **Two lists of people that nothing reconciles will disagree**, and the one that
gates sign-in is Clerk's, so the other is decoration at best and a lie about who has access
at worst. That table was dropped.

### You cannot invite from this app, and that is a fact about the instance

`clerkClient().invitations.createInvitation()` takes **`emailAddress` and has no phone
field** — read from `@clerk/backend`'s own types, not assumed — and this instance identifies
people by phone (auth-clerk GOTCHA 9). `users.createUser()` *does* take a phone, but it mints
an account outright rather than inviting one, which is a different decision about who may
create an identity and belongs to the Clerk seat.

**So accounts are still invited from the Clerk Dashboard.** This app decides what those
accounts can see — or will, once § 1a is true.

### 1a. The role IS enforced, as of 2026-08-24

`src/lib/authz.ts` is the layer. It is read by **pages and route handlers**, never by
`src/proxy.ts` — middleware runs on the edge, where Prisma's driver adapter does not go, and
that file belongs to the Clerk seat. The proxy still answers one question, "is somebody signed
in"; what they may see is decided a layer in.

| Viewer | Sees |
|---|---|
| `MANAGEMENT` | Everything, every fund |
| `INVESTOR` | Their own fund's portfolio. Not the Deal Room, not Fund & Users, not another fund |
| Assigned nothing | **Nothing.** Fails closed |
| Bootstrap (no assignments exist at all) | Everything, with a banner saying why |

**The bootstrap valve is the part to understand before touching it.** With ZERO rows in
`UserRole`, everyone signed in is treated as management. Without that, the first deploy of
`authz.ts` would have locked the portal's owners out — a fail-closed check against an empty
table denies everybody — and nothing in this repo can reach Railway's Postgres to undo it. It
closes the moment one assignment exists, and the Portfolio screen shows an amber banner while
it is holding, so "why can everyone see everything" has a visible answer.

**Hiding a nav link is not a control.** `PortalShell` drops the Admin section for investors,
and every page and route behind it guards itself anyway. A nav that only hid its own entries
would leave the URL open to anyone who typed it. `PortalShell`'s `isManagement` prop defaults
to `true` on purpose: a caller that forgets shows MORE chrome, so the mistake is visible on
screen rather than being a screen somebody quietly cannot find.

**Investor-facing DOCUMENTS are still not served.** The authorization layer exists and scopes
by fund, but nothing uploads to the `investors/` prefix — the upload API refuses that
audience — and no route reads it. There is nothing there to show yet.

## 2. Shape

| Model | Holds |
|---|---|
| `Fund` | `name`, optional `inceptionDate` (a `DATE`), its deals and role assignments |
| `UserRole` | unique `clerkUserId`, `fundId`, `role`, `assignedBy` |

**Keyed by `clerkUserId`, not phone.** Phone matching would need normalisation — `+1 555 000
1111` and `5550001111` are one person and two strings — and getting that wrong on the field
that decides what somebody can see fails quietly and in the dangerous direction.

`Fund → User` is `onDelete: Restrict`, same as `Fund → Deal`. A fund with anything attached
cannot be deleted, which is why **there is no fund delete route** — it would fail at the
database and a button that cannot work is worse than none.

**`inceptionDate` is nullable on purpose.** Fund 1 predates the column, and this repo may not
invent a fund figure — an inception date is one. A default would have written a date nobody
supplied onto the fund every deal belongs to. It is a `DATE`, not a timestamp: an inception
is a calendar day, and a time component invites a timezone to move it across midnight.

### Routes

```
GET    /api/funds                     list, with per-fund assignment and deal counts
POST   /api/funds                     { name, inceptionDate? }
GET    /api/users                     CLERK'S accounts, each joined to its assignment
PUT    /api/users/<clerkUserId>/role  { role, fundId } — upsert
DELETE /api/users/<clerkUserId>/role  clear the assignment; Clerk access is untouched
```

There is no user create or delete. An account is born and killed in the Clerk Dashboard.

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

**GOTCHA 4 — the account list is capped at 100 and says so.**
`CLERK_LIST_LIMIT`. Past that the screen shows a notice rather than silently displaying a
prefix; paging is not built. The population is two.

**GOTCHA 5 — `/fund-users` is `force-dynamic`, and needs to be.**
It queries Postgres in a server component. Without it Next tries to prerender at build time
and CI builds with no `DATABASE_URL`.

**GOTCHA 6 — both lists are PROPS, not mount fetches.**
React 19's `react-hooks/set-state-in-effect` rejects a state update driven by an effect on
mount. Re-adding a `useEffect` that fetches will fail `npm run lint`.

---

## 4. Deliberately not built

- **Serving investor-facing documents.** § 1a — the layer is there, the files are not.

- **Inviting or creating accounts.** § 1 — the instance is phone-first and Clerk's invitations
  are email-only. Changing that is the Clerk seat's call.
- **Renaming or deleting a fund.** Create only.
- **Paging the account list.** GOTCHA 4.
- **More than two roles.** `MANAGEMENT` and `INVESTOR` mirror `Audience` so the two agree.
  A third is a migration and a conversation about what it would mean.
