"use client";

import { useCallback, useId, useState } from "react";
import { Building2, Plus, Trash2, TriangleAlert, Users } from "lucide-react";
import { C } from "./palette";

/**
 * Fund & Users — the roster (owner, 2026-08-24).
 *
 * > "under Admin create 'Fund & Users' ... first name, last name, phone, fund,
 * > role ... toggle at the top 'Fund | Users' ... Create Fund just simple...
 * > Create New and name of fund + inception date ... users can be added to a
 * > fund"
 *
 * ## The notice at the top of the Users tab is the most important thing here
 *
 * **This screen creates RECORDS, not accounts.** Adding somebody does not create
 * a Clerk account, does not send an invitation, and does not let them sign in.
 * Removing somebody does not revoke anything. Access is Clerk's restricted
 * sign-up plus an invitation from the Clerk Dashboard, and that has not changed.
 *
 * A table of people with a Role column beside it looks exactly like a
 * permissions system. It is not one, and the failure that matters — somebody
 * believing a person was removed when they were not — is silent. So the screen
 * says it rather than leaving it to a doc nobody opens.
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
  inceptionDate: string | null;
  userCount: number;
  dealCount: number;
};

export type RosterUser = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  role: "MANAGEMENT" | "INVESTOR";
  fundId: number;
  fundName: string;
};

const ROLES: RosterUser["role"][] = ["MANAGEMENT", "INVESTOR"];

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
const secondaryButton: React.CSSProperties = {
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "inherit",
  textDecoration: "none",
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
  initialUsers,
}: {
  initialFunds: Fund[] | null;
  initialUsers: RosterUser[] | null;
}) {
  const [tab, setTab] = useState<"funds" | "users">("funds");
  const [funds, setFunds] = useState<Fund[]>(initialFunds ?? []);
  const [users, setUsers] = useState<RosterUser[]>(initialUsers ?? []);

  const refresh = useCallback(async () => {
    const [f, u] = await Promise.all([fetch("/api/funds"), fetch("/api/users")]);
    if (f.ok) setFunds((await f.json()).funds);
    if (u.ok) setUsers((await u.json()).users);
  }, []);

  // `null` means "not configured", which is a different thing from "configured
  // and empty" — conflating them would show "create your first fund" on a
  // broken deploy.
  if (initialFunds === null || initialUsers === null) {
    return (
      <Notice tone="error">
        The database is not configured, so funds and users cannot be read. Set{" "}
        <strong>DATABASE_URL</strong> on the app service in Railway.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <Toggle tab={tab} setTab={setTab} />
      {tab === "funds" ? (
        <FundsTab funds={funds} onChanged={refresh} />
      ) : (
        <UsersTab users={users} funds={funds} onChanged={refresh} />
      )}
    </div>
  );
}

function FundsTab({ funds, onChanged }: { funds: Fund[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [inceptionDate, setInceptionDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const dateId = useId();

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), inceptionDate }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the fund.");
      setName("");
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
        <div className="flex items-center" style={{ ...cardHeader, gap: 8 }}>
          <Plus size={14} color={C.accent} />
          Create New Fund
        </div>
        <div className="flex flex-col" style={{ gap: 12, padding: 16 }}>
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
            <div className="flex flex-col md:w-[200px]" style={{ gap: 6 }}>
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
            The inception date is optional — a fund can exist here before anyone has
            looked it up.
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
              <div
                key={f.id}
                className="flex flex-wrap items-center"
                style={{ gap: 12, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}
              >
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, ...numCell }}>
                    Fund {f.id}
                    {f.inceptionDate ? ` · inception ${f.inceptionDate}` : " · no inception date"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, ...numCell }}>
                  {f.userCount} {f.userCount === 1 ? "user" : "users"} · {f.dealCount}{" "}
                  {f.dealCount === 1 ? "deal" : "deals"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({
  users,
  funds,
  onChanged,
}: {
  users: RosterUser[];
  funds: Fund[];
  onChanged: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [fundId, setFundId] = useState<string>(funds[0] ? String(funds[0].id) : "");
  const [role, setRole] = useState<RosterUser["role"]>("INVESTOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = firstName.trim() && lastName.trim() && phone.trim() && fundId;

  const create = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          fundId: Number(fundId),
          role,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not add the user.");
      setFirstName("");
      setLastName("");
      setPhone("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/*
        The whole reason this screen needs a warning. A roster beside a Role
        column reads as a permissions system; it is not one, and the failure —
        believing somebody was removed when they were not — is silent.
      */}
      <Notice tone="warn">
        <span className="inline-flex items-center" style={{ gap: 6, fontWeight: 700 }}>
          <TriangleAlert size={13} />
          This is a record, not an account.
        </span>{" "}
        Adding someone here does not create a login, send an invitation, or grant
        access — and removing them does not revoke it. Accounts are invited from the
        Clerk Dashboard. <strong>Role is stored but not yet enforced:</strong> anyone
        who can sign in sees everything.
      </Notice>

      <div style={card}>
        <div className="flex items-center" style={{ ...cardHeader, gap: 8 }}>
          <Plus size={14} color={C.accent} />
          Add User
        </div>
        <div className="flex flex-col" style={{ gap: 12, padding: 16 }}>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {funds.length === 0 ? (
            <Notice tone="muted">Create a fund first — a user belongs to one.</Notice>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <Field labelText="First name">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={input}
                  />
                </Field>
                <Field labelText="Last name">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={input}
                  />
                </Field>
                <Field labelText="Phone">
                  {/*
                    `type="tel"`, and stored exactly as typed. The Clerk instance
                    identifies people by phone, so this is the field that would
                    join a roster row to a real account — but normalising it here
                    would guess at a country code, and guessing wrong on the one
                    field that has to match Clerk is worse than storing what was
                    entered. It is unique; the API says whose it is on a clash.
                  */}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 1111"
                    style={input}
                  />
                </Field>
                <Field labelText="Fund">
                  <select
                    value={fundId}
                    onChange={(e) => setFundId(e.target.value)}
                    style={input}
                  >
                    {funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field labelText="Role">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RosterUser["role"])}
                    style={input}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r === "MANAGEMENT" ? "Management" : "Investor"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                onClick={() => void create()}
                disabled={busy || !ready}
                className="inline-flex items-center justify-center self-start min-h-[44px] md:min-h-0"
                style={{ ...primaryButton, opacity: busy || !ready ? 0.5 : 1 }}
              >
                <Plus size={14} />
                {busy ? "Adding…" : "Add User"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={card}>
        <div className="flex items-center" style={{ ...cardHeader, gap: 8 }}>
          <Users size={14} color={C.accent} />
          Roster
        </div>
        {users.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: C.textMuted }}>No users yet.</div>
        ) : (
          <div className="flex flex-col">
            {users.map((u) => (
              <UserRow key={u.id} user={u} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A labelled control.
 *
 * The `<label>` WRAPS the control rather than pointing at it with `htmlFor`.
 * Wrapping associates the label with the first form control inside it, which
 * needs no id to be generated and threaded through — and `htmlFor` aimed at a
 * wrapper `<div>` associates with nothing at all, which is a label that looks
 * right in the markup and does nothing for a screen reader.
 */
function Field({ labelText, children }: { labelText: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col" style={{ gap: 6 }}>
      <span style={label}>{labelText}</span>
      {children}
    </label>
  );
}

function UserRow({ user, onChanged }: { user: RosterUser; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setConfirming(false);
      onChanged();
    } catch {
      setError("Could not remove. Try again.");
      setBusy(false);
    }
    // Not clearing `busy` on success: the row is about to unmount, and
    // re-enabling first invites a second DELETE on an id that is already gone.
  };

  const isManagement = user.role === "MANAGEMENT";

  return (
    <div
      className="flex flex-wrap items-center"
      style={{ gap: 12, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}
    >
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          {user.firstName} {user.lastName}
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
          {error ?? `${user.phone} · ${user.fundName}`}
        </div>
      </div>

      {/*
        Neutral, not tinted by role. A badge's tone encodes STATE, never
        category (DECISIONS 2026-08-24) — and "Management" is a category. Giving
        it accent or green here would also imply the role does something, which
        is the exact misreading the notice above exists to prevent.
      */}
      <span
        style={{
          padding: "3px 8px",
          borderRadius: 4,
          border: `1px solid ${C.border}`,
          background: C.bgAlt,
          color: C.textMuted,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          flexShrink: 0,
        }}
      >
        {isManagement ? "Management" : "Investor"}
      </span>

      {confirming ? (
        <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>Remove?</span>
          <button
            onClick={() => void remove()}
            disabled={busy}
            className="inline-flex items-center min-h-[44px] md:min-h-0"
            style={{
              ...secondaryButton,
              border: `1px solid ${C.redBorder}`,
              background: C.redBg,
              color: C.red,
            }}
          >
            {busy ? "Removing…" : "Yes, remove"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={busy}
            className="inline-flex items-center min-h-[44px] md:min-h-0"
            style={secondaryButton}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${user.firstName} ${user.lastName}`}
          className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
          style={{ ...secondaryButton, padding: "8px 10px", color: C.textMuted, flexShrink: 0 }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
