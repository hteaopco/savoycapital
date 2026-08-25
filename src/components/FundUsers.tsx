"use client";

import { useCallback, useId, useState } from "react";
import { Building2, ChevronDown, Plus, TriangleAlert, Users } from "lucide-react";
import { centsToDollarInput, formatCents, groupDollarInput } from "@/lib/money";
import { C } from "./palette";

/**
 * Fund & Users — the roster (owner, 2026-08-24).
 *
 * > "under Admin create 'Fund & Users' ... first name, last name, phone, fund,
 * > role ... toggle at the top 'Fund | Users' ... Create Fund just simple...
 * > Create New and name of fund + inception date ... users can be added to a
 * > fund"
 *
 * ## The Users tab lists CLERK'S accounts, not a roster of its own
 *
 * Owner, 2026-08-24: *"can we just read users from clerk?"* — yes, and that is
 * now what this does. The first version kept its own list of names and phone
 * numbers, which was the wrong shape: two lists of people that nothing
 * reconciles will disagree, and the one that gates sign-in is Clerk's.
 *
 * So every row here is a real account that can really sign in. What this app
 * adds is the two facts Clerk has no opinion about — **which fund, and what
 * role** — and those are the only things the controls change.
 *
 * **Assigning a role still grants nothing today.** Nothing reads it yet;
 * enforcement is a separate change, sequenced after this one so the assignments
 * exist before anything depends on them. The notice on the tab says so, because
 * a Role dropdown beside a list of real accounts looks exactly like it is
 * already deciding something.
 *
 * ## Data loading
 *
 * Both lists arrive as props from the server component, for the same reason the
 * Deal Room's do: React 19's `react-hooks/set-state-in-effect` rejects a mount
 * effect that sets state, and loading on the server removes the effect, the
 * loading state and a round trip at once. Every fetch below hangs off a user
 * action.
 */

export type Fund = {
  id: number;
  name: string;
  /** Integer cents, or `null` until somebody sets it. */
  sizeCents: number | null;
  inceptionDate: string | null;
  assignedCount: number;
  dealCount: number;
};

export type Role = "MANAGEMENT" | "INVESTOR";

/** A Clerk account, plus whatever this app has assigned to it. */
export type Person = {
  clerkUserId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  /** `null` until somebody assigns one. */
  role: Role | null;
  fundId: number | null;
  fundName: string | null;
};

const ROLES: Role[] = ["MANAGEMENT", "INVESTOR"];

/** Clerk can leave both names blank; a blank row reads as broken, not empty. */
function personLabel(p: Person): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return name || p.phone || p.email || p.clerkUserId;
}

const card: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.bg,
};
const cardHeader: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${C.border}`,
  fontSize: 13,
  fontWeight: 800,
  color: C.text,
};
const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: C.textDim,
};
const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
};
const primaryButton: React.CSSProperties = {
  gap: 6,
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid ${C.accent}`,
  background: C.accent,
  color: C.onSolid,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
};
const numCell: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

function Notice({
  tone,
  children,
}: {
  tone: "error" | "warn" | "muted";
  children: React.ReactNode;
}) {
  const palette =
    tone === "error"
      ? { bg: C.redBg, border: C.redBorder, text: C.red }
      : tone === "warn"
        ? { bg: C.amberBg, border: C.amberBorder, text: C.amber }
        : { bg: C.bgAlt, border: C.border, text: C.textMuted };
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/** The Fund | Users switch. Two buttons, not a `<select>` — there are two. */
function Toggle({
  tab,
  setTab,
}: {
  tab: "funds" | "users";
  setTab: (t: "funds" | "users") => void;
}) {
  const options: { id: "funds" | "users"; labelText: string; Icon: typeof Users }[] = [
    { id: "funds", labelText: "Fund", Icon: Building2 },
    { id: "users", labelText: "Users", Icon: Users },
  ];
  return (
    <div
      role="tablist"
      className="inline-flex"
      style={{
        gap: 2,
        padding: 3,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bgAlt,
      }}
    >
      {options.map(({ id, labelText, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => setTab(id)}
            className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
            style={{
              gap: 7,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              // The selected half is a solid accent, which is the one place on
              // this screen a solid tone is right: it is a control's ON state,
              // not decoration.
              background: active ? C.accent : "transparent",
              color: active ? C.onSolid : C.textMuted,
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              fontFamily: "inherit",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            <Icon size={14} />
            {labelText}
          </button>
        );
      })}
    </div>
  );
}

export function FundUsers({
  initialFunds,
  initialPeople,
  truncated,
  listLimit,
}: {
  initialFunds: Fund[] | null;
  initialPeople: Person[] | null;
  truncated: boolean;
  /**
   * Passed down rather than imported. `@/lib/clerk-users` carries
   * `import "server-only"`, and a client component reaching into it is a build
   * error — which is exactly what that import is for, and it caught this.
   */
  listLimit: number;
}) {
  const [tab, setTab] = useState<"funds" | "users">("funds");
  const [funds, setFunds] = useState<Fund[]>(initialFunds ?? []);
  const [people, setPeople] = useState<Person[]>(initialPeople ?? []);

  const refresh = useCallback(async () => {
    const [f, u] = await Promise.all([fetch("/api/funds"), fetch("/api/users")]);
    if (f.ok) setFunds((await f.json()).funds);
    if (u.ok) setPeople((await u.json()).people);
  }, []);

  // The two halves fail independently and are reported separately: a missing
  // CLERK_SECRET_KEY and a missing DATABASE_URL send you to different variables,
  // and one error covering both would send you to the wrong one.
  if (initialFunds === null) {
    return (
      <Notice tone="error">
        The database is not configured, so funds and role assignments cannot be read.
        Set <strong>DATABASE_URL</strong> on the app service in Railway.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <Toggle tab={tab} setTab={setTab} />
      {tab === "funds" ? (
        <FundsTab funds={funds} onChanged={refresh} />
      ) : (
        <UsersTab
          people={initialPeople === null ? null : people}
          funds={funds}
          truncated={truncated}
          listLimit={listLimit}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function FundsTab({ funds, onChanged }: { funds: Fund[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [sizeCents, setSizeCents] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Collapsed by default (owner, 2026-08-24). Unlike the Deal Room's upload
   * form, which opens because uploading is the reason you came, creating a fund
   * is a rare act — there is one fund and there will not be many. The form
   * sitting open pushes the fund list, which IS what you came to see, below the
   * fold of its own card.
   */
  const [formOpen, setFormOpen] = useState(false);
  const nameId = useId();
  const sizeId = useId();
  const dateId = useId();

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sizeCents, inceptionDate }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the fund.");
      setName("");
      setSizeCents("");
      setInceptionDate("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the fund.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div style={card}>
        <button
          onClick={() => setFormOpen((v) => !v)}
          aria-expanded={formOpen}
          className="flex items-center min-h-[44px] md:min-h-0"
          style={{
            ...cardHeader,
            gap: 8,
            width: "100%",
            border: "none",
            // The rule under the header goes with the body it separates. Left
            // behind on a collapsed card it reads as an empty section.
            borderBottom: formOpen ? `1px solid ${C.border}` : "none",
            background: "transparent",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <ChevronDown
            size={14}
            color={C.textMuted}
            style={{
              flexShrink: 0,
              transform: formOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 160ms ease",
            }}
          />
          <Plus size={14} color={C.accent} />
          <span style={{ flex: 1 }}>Create New Fund</span>
        </button>
        {/*
          Hidden with `display`, not unmounted — which is the one place this
          differs from the Deal Room's otherwise identical collapse. Both look
          the same; this one keeps a half-typed fund name if you collapse the
          card mid-entry, and there is nothing expensive mounted behind it to
          justify tearing it down.
        */}
        <div
          className="flex flex-col"
          style={{ gap: 12, padding: 16, display: formOpen ? undefined : "none" }}
        >
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
              <label htmlFor={nameId} style={label}>
                Fund name
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What is this fund called?"
                style={input}
              />
            </div>
            <div className="flex flex-col md:w-[170px]" style={{ gap: 6 }}>
              <label htmlFor={sizeId} style={label}>
                Fund size
              </label>
              {/*
                A text input with a numeric inputMode, which the design gate
                requires for money. The reason is that a spinner control can be
                scrolled or arrowed into a different figure by a stray gesture
                over a focused field — on a fund size, silently. Dollars in,
                cents stored; parseDollarsToCents is the one place that
                converts, on both sides of the wire.
              */}
              <input
                id={sizeId}
                type="text"
                inputMode="numeric"
                value={sizeCents}
                onChange={(e) => setSizeCents(e.target.value)}
                // Grouped on blur, never on every keystroke. Reformatting
                // mid-word moves the caret, so live grouping makes typing a
                // long figure feel possessed; `groupDollarInput` leaves
                // anything it cannot parse exactly as it was entered.
                onBlur={(e) => setSizeCents(groupDollarInput(e.target.value))}
                placeholder="10,000,000"
                style={{ ...input, ...numCell }}
              />
            </div>
            <div className="flex flex-col md:w-[170px]" style={{ gap: 6 }}>
              <label htmlFor={dateId} style={label}>
                Inception date
              </label>
              {/*
                A real date input. `type="text" inputMode="numeric"` is the
                design gate's rule for NUMBERS — it exists so a number field
                cannot be scrolled or spun into a wrong figure. A date is not a
                number, and hand-rolling a picker to avoid a rule aimed at
                something else would be worse on every axis.
              */}
              <input
                id={dateId}
                type="date"
                value={inceptionDate}
                onChange={(e) => setInceptionDate(e.target.value)}
                style={input}
              />
            </div>
            <button
              onClick={() => void create()}
              disabled={busy || !name.trim()}
              className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
              style={{ ...primaryButton, opacity: busy || !name.trim() ? 0.5 : 1 }}
            >
              <Plus size={14} />
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            Size and inception date are both optional — a fund can be named before
            anyone has looked them up, and filled in from its row afterwards.
          </div>
        </div>
      </div>

      <div style={card}>
        <div className="flex items-center" style={{ ...cardHeader, gap: 8 }}>
          <Building2 size={14} color={C.accent} />
          Funds
        </div>
        {funds.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: C.textMuted }}>
            No funds yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {funds.map((f) => (
              <FundRow key={f.id} fund={f} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One fund, with an editor for the two figures Clerk and the deal table cannot
 * supply: size and inception date.
 *
 * **Opens by default when either is missing** (owner, 2026-08-24: "can you make
 * it to where i can backfill the values on first load"). Fund 1 predates both
 * columns, so the first time this screen loads the fields that need filling are
 * already in front of you rather than behind a chevron. Once both are set the
 * row collapses to a summary, because at that point the figures are worth
 * reading and the inputs are not.
 */
function FundRow({ fund, onChanged }: { fund: Fund; onChanged: () => void }) {
  const needsBackfill = fund.sizeCents === null || fund.inceptionDate === null;
  const [open, setOpen] = useState(needsBackfill);
  const [size, setSize] = useState(centsToDollarInput(fund.sizeCents));
  const [inception, setInception] = useState(fund.inceptionDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const sizeId = useId();
  const dateId = useId();

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/funds/${fund.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Both keys always sent: the route treats an absent key as "leave
        // alone" and an empty string as "clear", so sending both means the form
        // says exactly what it shows.
        body: JSON.stringify({ sizeCents: size, inceptionDate: inception }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not save.");
      setSaved(true);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ borderTop: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex flex-wrap items-center min-h-[44px] md:min-h-0"
        style={{
          gap: 12,
          padding: "12px 16px",
          width: "100%",
          border: "none",
          background: "transparent",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <ChevronDown
          size={14}
          color={C.textMuted}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 160ms ease",
          }}
        />
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fund.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, ...numCell }}>
            Fund {fund.id} · {formatCents(fund.sizeCents)}
            {fund.inceptionDate ? ` · inception ${fund.inceptionDate}` : ""}
          </div>
        </div>
        {/*
          Amber, and only while something is genuinely missing. A permanent
          badge would be decoration; this one disappears the moment the backfill
          is done, which is what makes it worth looking at.
        */}
        {needsBackfill ? (
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${C.amberBorder}`,
              background: C.amberBg,
              color: C.amber,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              flexShrink: 0,
            }}
          >
            Needs values
          </span>
        ) : null}
        <div style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, ...numCell }}>
          {fund.assignedCount} assigned · {fund.dealCount}{" "}
          {fund.dealCount === 1 ? "deal" : "deals"}
        </div>
      </button>

      {open ? (
        <div
          className="flex flex-col"
          style={{ gap: 12, padding: "0 16px 16px 42px", background: C.bgAlt }}
        >
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-col md:w-[200px]" style={{ gap: 6 }}>
              <label htmlFor={sizeId} style={label}>
                Fund size
              </label>
              <input
                id={sizeId}
                type="text"
                inputMode="numeric"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                onBlur={(e) => setSize(groupDollarInput(e.target.value))}
                placeholder="10,000,000"
                style={{ ...input, ...numCell }}
              />
            </div>
            <div className="flex flex-col md:w-[200px]" style={{ gap: 6 }}>
              <label htmlFor={dateId} style={label}>
                Inception date
              </label>
              <input
                id={dateId}
                type="date"
                value={inception}
                onChange={(e) => setInception(e.target.value)}
                style={input}
              />
            </div>
            <button
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
              style={{ ...primaryButton, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            Dollars, stored as cents. Clearing a field removes the value.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UsersTab({
  people,
  funds,
  truncated,
  listLimit,
  onChanged,
}: {
  people: Person[] | null;
  funds: Fund[];
  truncated: boolean;
  listLimit: number;
  onChanged: () => void;
}) {
  if (people === null) {
    return (
      <Notice tone="error">
        Clerk&apos;s backend API is not configured, so the account list cannot be read.
        Set <strong>CLERK_SECRET_KEY</strong> on the app service in Railway.
      </Notice>
    );
  }

  const unassigned = people.filter((p) => p.role === null).length;

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/*
        A Role dropdown beside a list of real accounts looks exactly like it is
        already deciding something. It is not, yet — and the failure that
        misreading invites is silent, so it is said on the screen rather than
        only in a doc.
      */}
      <Notice tone="warn">
        <span className="inline-flex items-center" style={{ gap: 6, fontWeight: 700 }}>
          <TriangleAlert size={13} />
          Roles are not enforced yet.
        </span>{" "}
        These are the real Clerk accounts that can sign in. Assigning a fund and role
        stores it, but nothing reads it — everyone signed in still sees everything.
        Enforcement lands as a separate change once these assignments exist.
      </Notice>

      {funds.length === 0 ? (
        <Notice tone="muted">Create a fund first — an assignment needs one.</Notice>
      ) : null}

      {truncated ? (
        <Notice tone="muted">
          Showing the first {listLimit} accounts. There are more, and this screen
          does not page yet.
        </Notice>
      ) : null}

      <div style={card}>
        <div className="flex flex-wrap items-center" style={{ ...cardHeader, gap: 8 }}>
          <Users size={14} color={C.accent} />
          <span style={{ flex: 1 }}>Clerk Accounts</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, ...numCell }}>
            {people.length} {people.length === 1 ? "account" : "accounts"}
            {unassigned > 0 ? ` · ${unassigned} unassigned` : ""}
          </span>
        </div>

        {people.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: C.textMuted }}>
            No accounts on the Clerk instance yet. They are invited from the Clerk
            Dashboard — this screen cannot create one.
          </div>
        ) : (
          <div className="flex flex-col">
            {people.map((p) => (
              <PersonRow key={p.clerkUserId} person={p} funds={funds} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>

      <Notice tone="muted">
        Accounts are created by invitation in the Clerk Dashboard, not here. Inviting
        from this app was considered and does not fit: Clerk&apos;s invitations require an
        email address, and this instance identifies people by phone.
      </Notice>
    </div>
  );
}

/**
 * One Clerk account, with its fund and role.
 *
 * Both controls save immediately on change rather than behind a Save button.
 * There are two fields and the write is an upsert, so a button would add a step
 * and a second state — "changed but not saved" — worth having only when a form
 * is long enough to want reviewing before it commits.
 */
function PersonRow({
  person,
  funds,
  onChanged,
}: {
  person: Person;
  funds: Fund[];
  onChanged: () => void;
}) {
  const [role, setRole] = useState<Role | "">(person.role ?? "");
  const [fundId, setFundId] = useState<string>(
    person.fundId ? String(person.fundId) : funds[0] ? String(funds[0].id) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (nextRole: Role | "", nextFundId: string) => {
    setError(null);
    // Clearing the role clears the whole assignment — a fund with no role is a
    // half-answer nothing could act on.
    if (!nextRole) {
      setBusy(true);
      try {
        const res = await fetch(`/api/users/${person.clerkUserId}/role`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        onChanged();
      } catch {
        setError("Could not clear. Try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!nextFundId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${person.clerkUserId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole, fundId: Number(nextFundId) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not save.");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center"
      style={{ gap: 12, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}
    >
      <div className="min-w-0 flex-1">
        {/* Comes from Clerk, so its length is not ours to bound — same
            treatment as the deal and holding names. */}
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflowWrap: "anywhere" }}>
          {personLabel(person)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: error ? C.red : C.textMuted,
            ...numCell,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {error ?? person.phone ?? person.email ?? "no phone or email on the account"}
        </div>
      </div>

      {/*
        Unassigned is called out rather than left as an empty dropdown. Once the
        enforcement change lands, an account with no assignment is the one that
        behaves differently, so it is worth being able to see at a glance which
        those are.
      */}
      {person.role === null ? (
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            border: `1px solid ${C.amberBorder}`,
            background: C.amberBg,
            color: C.amber,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            flexShrink: 0,
          }}
        >
          Unassigned
        </span>
      ) : null}

      <select
        value={fundId}
        onChange={(e) => {
          setFundId(e.target.value);
          if (role) void save(role, e.target.value);
        }}
        disabled={busy || funds.length === 0}
        aria-label={`Fund for ${personLabel(person)}`}
        style={{ ...input, width: "auto", minWidth: 150, fontSize: 12, padding: "8px 10px" }}
      >
        {funds.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <select
        value={role}
        onChange={(e) => {
          const next = e.target.value as Role | "";
          setRole(next);
          void save(next, fundId);
        }}
        disabled={busy || funds.length === 0}
        aria-label={`Role for ${personLabel(person)}`}
        style={{ ...input, width: "auto", minWidth: 140, fontSize: 12, padding: "8px 10px" }}
      >
        <option value="">— No role —</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r === "MANAGEMENT" ? "Management" : "Investor"}
          </option>
        ))}
      </select>
    </div>
  );
}
