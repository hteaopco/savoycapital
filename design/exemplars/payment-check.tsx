"use client";

import * as React from "react";
import { Plus, X, Search, RefreshCw, Trash2, Check, AlertTriangle } from "lucide-react";

import { C } from "@/components/accounting/palette";

// Payment Check — a P&L-by-class board. For the GL accounts the AP team watches
// (electricity, garbage, …), it shows which classes have or are MISSING a charge for
// the month, so a missing recurring bill is easy to spot. Read-only.

interface QboRef { id: string; name: string }
interface WatchAccount { id: string; qboAccountId: string; accountName: string }
interface Cell { className: string; amountCents: number; hasCharge: boolean }
interface Row { qboAccountId: string; accountName: string; found: boolean; cells: Cell[]; totalCents: number; missingCount: number }
interface Matrix { month: "this" | "last"; label: string; start: string; end: string; classes: string[]; rows: Row[] }

const money = (cents: number): string => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Group by the leading code segment: "6000_06 - Electricity" → "6000_06"; "Rent - 02 -
// Ground Lease" → "Rent". The row label then shows the rest ("Electricity", "02 - …").
const groupKey = (name: string): string => { const p = name.split(" - "); return (p.length > 1 ? p[0] : name).trim(); };
const accountLeaf = (name: string): string => { const i = name.indexOf(" - "); return i >= 0 ? name.slice(i + 3).trim() : name; };
function groupsOf(rows: Row[]): Array<{ key: string; rows: Row[] }> {
  const out: Array<{ key: string; rows: Row[] }> = [];
  const byKey = new Map<string, { key: string; rows: Row[] }>();
  for (const r of rows) {
    const k = groupKey(r.accountName);
    let g = byKey.get(k);
    if (!g) { g = { key: k, rows: [] }; byKey.set(k, g); out.push(g); }
    g.rows.push(r);
  }
  return out;
}

export function PaymentCheck() {
  const [month, setMonth] = React.useState<"this" | "last">("this");
  const [matrix, setMatrix] = React.useState<Matrix | null>(null);
  const [watch, setWatch] = React.useState<WatchAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);

  const loadMatrix = React.useCallback(async (which: "this" | "last") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/ap/payment-check?month=${which}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Couldn't load Payment Check");
      setMatrix(json as Matrix);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load Payment Check");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWatch = React.useCallback(async () => {
    const res = await fetch("/api/accounting/ap/payment-check/accounts", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (res.ok && json) setWatch(json.accounts as WatchAccount[]);
  }, []);

  React.useEffect(() => { void loadWatch(); }, [loadWatch]);
  React.useEffect(() => { void loadMatrix(month); }, [month, loadMatrix]);

  async function addAccounts(accts: QboRef[]) {
    const res = await fetch("/api/accounting/ap/payment-check/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts: accts.map((a) => ({ qboAccountId: a.id, accountName: a.name })) }),
    });
    const json = await res.json();
    if (res.ok) setWatch(json.accounts as WatchAccount[]);
    setShowAdd(false);
    await loadMatrix(month);
  }

  async function removeAccount(id: string) {
    await fetch(`/api/accounting/ap/payment-check/accounts/${id}`, { method: "DELETE" });
    await loadWatch();
    await loadMatrix(month);
  }

  // Join the matrix rows (charge data) to the watch list (has the row id for removal).
  const idByAccount = new Map(watch.map((w) => [w.qboAccountId, w.id]));
  const classes = matrix?.classes ?? [];

  const th: React.CSSProperties = { padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: C.textDim, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", textAlign: "center", background: C.bgAlt };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Payment Check</div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 640 }}>
            For the GL accounts you watch, which classes have a charge this month — so a missing recurring bill is easy to spot. Read from the P&amp;L by Class; nothing posts.
          </div>
        </div>
        <button onClick={() => loadMatrix(month)} disabled={loading} className="inline-flex items-center" style={{ gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between" style={{ padding: "8px 12px", borderRadius: 8, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 12 }}>
          <span className="inline-flex items-center" style={{ gap: 6 }}><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => setError(null)} style={{ border: "none", background: "transparent", color: C.red }}><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <div className="inline-flex" style={{ gap: 4, padding: 4, borderRadius: 10, background: C.bgAlt, border: `1px solid ${C.border}` }}>
          <Pill label="Last Month" active={month === "last"} onClick={() => setMonth("last")} />
          <Pill label="This Month" active={month === "this"} onClick={() => setMonth("this")} />
        </div>
        {matrix && <span style={{ fontSize: 12, color: C.textMuted }}>{matrix.label}</span>}
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center" style={{ marginLeft: "auto", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.accentBorder}`, background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 700 }}>
          <Plus size={15} /> Add New
        </button>
      </div>

      {watch.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 10, border: `1px dashed ${C.borderStrong}`, background: C.bgAlt, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
          No accounts yet — click <strong>Add New</strong> to pick the GL accounts to watch (e.g. Electricity, Garbage).
        </div>
      ) : loading && !matrix ? (
        <div style={{ padding: 24, borderRadius: 10, border: `1px dashed ${C.borderStrong}`, background: C.bgAlt, color: C.textMuted, fontSize: 13, textAlign: "center" }}>Loading the P&amp;L by class…</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: "inherit", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, zIndex: 1, minWidth: 200 }}>GL Account</th>
                  {classes.map((c) => <th key={c} style={th}>{c}</th>)}
                  <th style={{ ...th, textAlign: "right" }}>Missing</th>
                  <th style={{ ...th }}></th>
                </tr>
              </thead>
              <tbody>
                {groupsOf(matrix?.rows ?? []).map((g) => (
                  <React.Fragment key={g.key}>
                    <tr>
                      <td colSpan={classes.length + 3} style={{ padding: "7px 10px", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.accent, background: C.bgAlt, borderBottom: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, position: "sticky", left: 0 }}>
                        {g.key}
                      </td>
                    </tr>
                    {g.rows.map((r, i) => (
                      <tr key={r.qboAccountId} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                        <td style={{ padding: "6px 10px 6px 24px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: i % 2 ? C.bgAlt : C.bg, zIndex: 1 }}>
                          {accountLeaf(r.accountName)}
                        </td>
                        {r.cells.map((cell) => (
                          <td
                            key={cell.className}
                            title={`${cell.className}: ${cell.hasCharge ? money(cell.amountCents) : "no charge"}`}
                            style={{
                              padding: "6px 10px", fontSize: 11, borderBottom: `1px solid ${C.border}`, textAlign: "center", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                              background: cell.hasCharge ? C.greenBg : C.redBg,
                              color: cell.hasCharge ? C.green : C.red,
                              fontWeight: cell.hasCharge ? 600 : 700,
                            }}
                          >
                            {cell.hasCharge ? money(cell.amountCents) : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.missingCount ? C.red : C.textDim, fontWeight: r.missingCount ? 700 : 400 }}>
                          {r.missingCount}/{r.cells.length}
                        </td>
                        <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
                          {idByAccount.get(r.qboAccountId) && (
                            <button onClick={() => removeAccount(idByAccount.get(r.qboAccountId)!)} title="Remove from watch list" className="inline-flex items-center" style={{ padding: 4, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "6px 12px", fontSize: 11, color: C.textDim, borderTop: `1px solid ${C.border}` }}>
            <span style={{ color: C.green, fontWeight: 700 }}>green</span> = charge posted · <span style={{ color: C.red, fontWeight: 700 }}>red —</span> = no charge this month (possible missing bill)
          </div>
        </div>
      )}

      {showAdd && <AddAccountsModal existing={new Set(watch.map((w) => w.qboAccountId))} onClose={() => setShowAdd(false)} onAdd={addAccounts} />}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: active ? C.bg : "transparent", color: active ? C.accent : C.textMuted, fontSize: 12, fontWeight: 700, boxShadow: active ? `0 1px 2px ${C.border}` : "none" }}>
      {label}
    </button>
  );
}

function AddAccountsModal({ existing, onClose, onAdd }: { existing: Set<string>; onClose: () => void; onAdd: (a: QboRef[]) => Promise<void> }) {
  const [accounts, setAccounts] = React.useState<QboRef[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [picked, setPicked] = React.useState<Record<string, QboRef>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/accounting/ap/qbo/refs", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.accounts) setAccounts(json.accounts as QboRef[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = accounts
    .filter((a) => !existing.has(a.id))
    .filter((a) => { const n = a.name.toLowerCase(); return terms.every((t) => n.includes(t)); })
    .slice(0, 200);
  const pickedList = Object.values(picked);

  async function submit() {
    if (pickedList.length === 0) return;
    setSaving(true);
    try { await onAdd(pickedList); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 70 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, width: "min(560px, 100%)", maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Add GL accounts to watch</span>
          <button onClick={onClose} style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", color: C.textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div className="inline-flex items-center" style={{ gap: 8, width: "100%", padding: "6px 10px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <Search size={14} style={{ color: C.textDim }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts (e.g. 6000 electric)…" autoFocus style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: C.text }} />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 16, fontSize: 12, color: C.textDim }}>Loading accounts…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: C.textDim }}>No accounts match.</div>
          ) : (
            filtered.map((a, i) => {
              const on = !!picked[a.id];
              return (
                <button
                  key={a.id}
                  onClick={() => setPicked((p) => { const n = { ...p }; if (n[a.id]) delete n[a.id]; else n[a.id] = a; return n; })}
                  className="flex items-center"
                  style={{ gap: 10, width: "100%", textAlign: "left", padding: "8px 16px", border: "none", borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.bgAlt : C.bg, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? C.accent : C.borderStrong}`, background: on ? C.accent : C.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <Check size={12} color="#ffffff" />}
                  </span>
                  <span style={{ fontSize: 13, color: C.text }}>{a.name}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-end" style={{ gap: 8, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={submit} disabled={saving || pickedList.length === 0} className="inline-flex items-center" style={{ gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#ffffff", fontSize: 13, fontWeight: 700, opacity: saving || pickedList.length === 0 ? 0.5 : 1 }}>
            <Plus size={15} /> {saving ? "Adding…" : `Add ${pickedList.length || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
