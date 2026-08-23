"use client";

import * as React from "react";
import { RefreshCw, ClipboardList, LayoutGrid, FileText, X, Search, ExternalLink, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Zap, Check } from "lucide-react";

import { C } from "@/components/accounting/palette";

// AP Aging — every open QuickBooks bill, itemized (Current tab, sortable) and bucketed
// by how overdue it is (Aging tab, drill into each vendor). Read-only.

type BucketKey = "current" | "d0_30" | "d31_60" | "d61_90" | "d90p";
const BUCKETS: Array<{ key: BucketKey; label: string }> = [
  { key: "current", label: "Current" },
  { key: "d0_30", label: "0–30" },
  { key: "d31_60", label: "31–60" },
  { key: "d61_90", label: "61–90" },
  { key: "d90p", label: "90+" },
];

interface AgingBill {
  id: string;
  docNumber: string | null;
  vendorName: string | null;
  txnDate: string | null;
  dueDate: string | null;
  balanceCents: number;
  accounts: string[];
  classes: string[];
  daysOverdue: number | null;
  bucket: BucketKey;
}
interface VendorRow { vendorName: string; buckets: Record<BucketKey, number>; totalCents: number }
interface AgingResult {
  today: string;
  bills: AgingBill[];
  byVendor: VendorRow[];
  totals: Record<BucketKey, number>;
  grandTotalCents: number;
}

const money = (cents: number): string => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (cents: number): string => (cents === 0 ? "—" : money(cents));
const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
};
// Show only the leaf after the last ":" — "…Expenses:6000_08 - Laundry" → "6000_08 - Laundry".
const glLeaf = (name: string): string => { const i = name.lastIndexOf(":"); return i >= 0 ? name.slice(i + 1).trim() : name; };
const glDisplay = (accounts: string[]): string => (accounts.length === 0 ? "—" : accounts.length === 1 ? glLeaf(accounts[0]) : `${glLeaf(accounts[0])} +${accounts.length - 1}`);
const classDisplay = (classes: string[]): string => (classes.length === 0 ? "—" : classes.length === 1 ? classes[0] : `${classes[0]} +${classes.length - 1}`);

function dueLabel(b: AgingBill): { text: string; color: string } {
  if (b.daysOverdue == null) return { text: "no due date", color: C.textDim };
  if (b.daysOverdue > 0) return { text: `${b.daysOverdue}d overdue`, color: C.red };
  if (b.daysOverdue === 0) return { text: "due today", color: C.amber };
  return { text: `in ${-b.daysOverdue}d`, color: C.textMuted };
}

type SortKey = "entered" | "vendor" | "invoice" | "due" | "status" | "gl" | "class" | "amount";
const NUMERIC: Set<SortKey> = new Set(["entered", "due", "status", "amount"]);
function sortValue(b: AgingBill, key: SortKey): string | number {
  switch (key) {
    case "entered": return b.txnDate ?? "";
    case "vendor": return (b.vendorName ?? "").toLowerCase();
    case "invoice": return (b.docNumber ?? "").toLowerCase();
    case "due": return b.dueDate ?? "";
    case "status": return b.daysOverdue ?? -1e9;
    case "gl": return glLeaf(b.accounts[0] ?? "").toLowerCase();
    case "class": return (b.classes[0] ?? "").toLowerCase();
    case "amount": return b.balanceCents;
  }
}

export function ApAging() {
  const [tab, setTab] = React.useState<"current" | "aging">("current");
  const [data, setData] = React.useState<AgingResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "status", dir: "desc" });
  const [viewUrl, setViewUrl] = React.useState<string | null>(null);
  const [viewBusy, setViewBusy] = React.useState<string | null>(null);
  const [autoPay, setAutoPay] = React.useState<Set<string>>(new Set());
  const [hideAutoPay, setHideAutoPay] = React.useState(true);
  const [showAutoPay, setShowAutoPay] = React.useState(false);

  const loadAutoPay = React.useCallback(async () => {
    const res = await fetch("/api/accounting/ap/aging/auto-pay", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (res.ok && json) setAutoPay(new Set(json.vendors as string[]));
  }, []);
  React.useEffect(() => { void loadAutoPay(); }, [loadAutoPay]);

  async function saveAutoPay(vendors: string[]) {
    const res = await fetch("/api/accounting/ap/aging/auto-pay", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendors }) });
    if (res.ok) setAutoPay(new Set(vendors));
    setShowAutoPay(false);
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/ap/aging", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Couldn't load AP aging");
      setData(json as AgingResult);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load AP aging");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const viewInvoice = React.useCallback(async (id: string) => {
    setViewBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/accounting/ap/aging/bill/${id}/view`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "No document for this bill.");
      setViewUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No document for this bill.");
    } finally {
      setViewBusy(null);
    }
  }, []);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: NUMERIC.has(key) ? "desc" : "asc" }));
  }

  // When hiding auto-pay, drop those vendors and re-derive the bucket totals from what's
  // left, so the summary cards + counts reflect only what we actually cut checks for.
  const visibleData = React.useMemo<AgingResult | null>(() => {
    if (!data) return null;
    if (!hideAutoPay || autoPay.size === 0) return data;
    const bills = data.bills.filter((b) => !autoPay.has(b.vendorName ?? ""));
    const byVendor = data.byVendor.filter((v) => !autoPay.has(v.vendorName));
    const totals: Record<BucketKey, number> = { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
    for (const v of byVendor) for (const b of BUCKETS) totals[b.key] += v.buckets[b.key];
    const grandTotalCents = byVendor.reduce((s, v) => s + v.totalCents, 0);
    return { ...data, bills, byVendor, totals, grandTotalCents };
  }, [data, hideAutoPay, autoPay]);

  const query = q.trim().toLowerCase();
  const bills = React.useMemo(() => {
    if (!visibleData) return [];
    const filtered = !query
      ? visibleData.bills
      : visibleData.bills.filter((b) => [b.vendorName, b.docNumber, ...b.accounts, ...b.classes].some((s) => (s ?? "").toLowerCase().includes(query)));
    const sorted = [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [visibleData, query, sort]);

  const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textDim, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" };
  const td: React.CSSProperties = { padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  const SortHead = ({ k, label, align }: { k: SortKey; label: string; align?: "right" }) => (
    <th style={{ ...th, textAlign: align ?? "left" }} onClick={() => toggleSort(k)} title="Sort">
      <span className="inline-flex items-center" style={{ gap: 3, color: sort.key === k ? C.accent : undefined }}>
        {label}
        {sort.key === k && (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>AP Aging</div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 640 }}>
            Every open QuickBooks bill — itemized and bucketed by how overdue it is{data ? ` as of ${fmtDate(data.today)}` : ""}. Read-only.
          </div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center" style={{ gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
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
          <TabBtn icon={<ClipboardList size={14} />} label={`Current${visibleData ? ` · ${visibleData.bills.length}` : ""}`} active={tab === "current"} onClick={() => setTab("current")} />
          <TabBtn icon={<LayoutGrid size={14} />} label="Aging" active={tab === "aging"} onClick={() => setTab("aging")} />
        </div>
        <div className="inline-flex items-center" style={{ gap: 8, marginLeft: "auto" }}>
          {autoPay.size > 0 && (
            <button
              onClick={() => setHideAutoPay((v) => !v)}
              title="Hide vendors on auto pay from this screen"
              className="inline-flex items-center"
              style={{ gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${hideAutoPay ? C.accentBorder : C.border}`, background: hideAutoPay ? C.accentBg : C.bg, color: hideAutoPay ? C.accent : C.textMuted, fontSize: 12, fontWeight: 600 }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${hideAutoPay ? C.accent : C.borderStrong}`, background: hideAutoPay ? C.accent : C.bg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {hideAutoPay && <Check size={11} color="#ffffff" />}
              </span>
              Hide auto pay · {autoPay.size}
            </button>
          )}
          <button onClick={() => setShowAutoPay(true)} className="inline-flex items-center" style={{ gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, fontWeight: 600 }}>
            <Zap size={14} /> Auto Pay
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div style={{ padding: 24, borderRadius: 10, border: `1px dashed ${C.borderStrong}`, background: C.bgAlt, color: C.textMuted, fontSize: 13, textAlign: "center" }}>Loading open bills from QuickBooks…</div>
      ) : !visibleData ? null : tab === "current" ? (
        <div className="flex flex-col" style={{ gap: 10 }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
            <div className="inline-flex items-center" style={{ gap: 8, flex: "1 1 240px", maxWidth: 340, padding: "6px 10px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
              <Search size={14} style={{ color: C.textDim }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by vendor, invoice, GL, class…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: C.text }} />
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
              {bills.length} bills · {money(bills.reduce((s, b) => s + b.balanceCents, 0))}
            </div>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse", fontFamily: "inherit" }}>
                <thead>
                  <tr>
                    <SortHead k="entered" label="Entered" /><SortHead k="vendor" label="Vendor" /><SortHead k="invoice" label="Invoice #" />
                    <SortHead k="due" label="Due" /><SortHead k="status" label="Status" /><SortHead k="gl" label="GL" />
                    <SortHead k="class" label="Class" /><SortHead k="amount" label="Amount" align="right" /><th style={{ ...th, cursor: "default" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: C.textDim }} colSpan={9}>No open bills{query ? " match your filter" : ""}.</td></tr>}
                  {bills.map((b, i) => {
                    const dl = dueLabel(b);
                    return (
                      <tr key={b.id} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                        <td style={{ ...td, color: C.textMuted }}>{fmtDate(b.txnDate)}</td>
                        <td style={{ ...td, color: C.text, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{b.vendorName ?? "—"}</td>
                        <td style={{ ...td, color: C.text }}>{b.docNumber ?? "—"}</td>
                        <td style={{ ...td, color: C.textMuted }}>{fmtDate(b.dueDate)}</td>
                        <td style={{ ...td, color: dl.color, fontWeight: 600 }}>{dl.text}</td>
                        <td style={{ ...td, color: C.textMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={b.accounts.map(glLeaf).join(", ")}>{glDisplay(b.accounts)}</td>
                        <td style={{ ...td, color: C.textMuted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={b.classes.join(", ")}>{classDisplay(b.classes)}</td>
                        <td style={{ ...tdNum, color: C.text, fontWeight: 700 }}>{money(b.balanceCents)}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <ViewButton id={b.id} busy={viewBusy === b.id} onView={viewInvoice} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <AgingSummary data={visibleData} onView={viewInvoice} viewBusy={viewBusy} />
      )}

      {viewUrl && <InvoiceModal url={viewUrl} onClose={() => setViewUrl(null)} />}
      {showAutoPay && data && (
        <AutoPayModal
          allVendors={[...new Set(data.bills.map((b) => b.vendorName ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b))}
          selected={autoPay}
          onClose={() => setShowAutoPay(false)}
          onSave={saveAutoPay}
        />
      )}
    </div>
  );
}

function ViewButton({ id, busy, onView }: { id: string; busy: boolean; onView: (id: string) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onView(id); }} disabled={busy} title="View invoice" className="inline-flex items-center" style={{ gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.accent, fontSize: 11, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
      <FileText size={12} /> {busy ? "…" : "View"}
    </button>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center" style={{ gap: 6, padding: "6px 12px", borderRadius: 7, border: "none", background: active ? C.bg : "transparent", color: active ? C.accent : C.textMuted, fontSize: 12, fontWeight: 700, boxShadow: active ? `0 1px 2px ${C.border}` : "none" }}>
      {icon} {label}
    </button>
  );
}

function AgingSummary({ data, onView, viewBusy }: { data: AgingResult; onView: (id: string) => void; viewBusy: string | null }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const th: React.CSSProperties = { textAlign: "right", padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textDim, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const nCols = BUCKETS.length + 3; // vendor + buckets + total + (chevron col merged into vendor)

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        {BUCKETS.map((b) => (
          <div key={b.key} style={{ padding: "12px 14px", borderRadius: 10, background: b.key === "d90p" ? C.redBg : b.key === "current" ? C.bg : C.bgAlt, border: `1px solid ${b.key === "d90p" ? C.redBorder : C.border}`, minWidth: 130, flex: "1 1 130px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: b.key === "d90p" ? C.red : C.textDim }}>{b.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: b.key === "d90p" ? C.red : C.text, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{money(data.totals[b.key])}</div>
          </div>
        ))}
        <div style={{ padding: "12px 14px", borderRadius: 10, background: C.accentBg, border: `1px solid ${C.accentBorder}`, minWidth: 140, flex: "1 1 140px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: C.accent }}>Total Open</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{money(data.grandTotalCents)}</div>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontFamily: "inherit" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Vendor</th>
                {BUCKETS.map((b) => <th key={b.key} style={th}>{b.label}</th>)}
                <th style={th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.byVendor.map((v, i) => {
                const isOpen = open === v.vendorName;
                return (
                  <React.Fragment key={v.vendorName}>
                    <tr onClick={() => setOpen(isOpen ? null : v.vendorName)} style={{ background: isOpen ? C.accentBg : i % 2 ? C.bgAlt : C.bg, cursor: "pointer" }}>
                      <td style={{ padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600 }}>
                        <span className="inline-flex items-center" style={{ gap: 6 }}>
                          {isOpen ? <ChevronDown size={14} style={{ color: C.accent }} /> : <ChevronRight size={14} style={{ color: C.textDim }} />}
                          {v.vendorName}
                        </span>
                      </td>
                      {BUCKETS.map((b) => <td key={b.key} style={{ ...td, color: b.key === "d90p" && v.buckets[b.key] > 0 ? C.red : C.textMuted }}>{money0(v.buckets[b.key])}</td>)}
                      <td style={{ ...td, color: C.text, fontWeight: 700 }}>{money(v.totalCents)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={nCols} style={{ padding: 0, borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                          <VendorDrill bills={data.bills.filter((b) => (b.vendorName ?? "") === v.vendorName)} onView={onView} viewBusy={viewBusy} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr>
                <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 800, color: C.text, borderTop: `2px solid ${C.borderStrong}` }}>Total</td>
                {BUCKETS.map((b) => <td key={b.key} style={{ ...td, fontWeight: 800, color: C.text, borderTop: `2px solid ${C.borderStrong}` }}>{money0(data.totals[b.key])}</td>)}
                <td style={{ ...td, fontWeight: 800, color: C.accent, borderTop: `2px solid ${C.borderStrong}` }}>{money(data.grandTotalCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VendorDrill({ bills, onView, viewBusy }: { bills: AgingBill[]; onView: (id: string) => void; viewBusy: string | null }) {
  const th: React.CSSProperties = { textAlign: "left", padding: "5px 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: C.textDim, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "5px 10px", fontSize: 12, whiteSpace: "nowrap" };
  return (
    <div style={{ padding: "8px 12px 12px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
      {BUCKETS.map((bk) => {
        const rows = bills.filter((b) => b.bucket === bk.key).sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
        if (rows.length === 0) return null;
        const total = rows.reduce((s, b) => s + b.balanceCents, 0);
        return (
          <div key={bk.key}>
            <div style={{ fontSize: 11, fontWeight: 800, color: bk.key === "d90p" ? C.red : C.accent, marginBottom: 2 }}>
              {bk.label} · {rows.length} · {money(total)}
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontFamily: "inherit", background: C.bg }}>
                <thead><tr><th style={th}>Invoice #</th><th style={th}>Entered</th><th style={th}>Due</th><th style={th}>Status</th><th style={th}>GL</th><th style={th}>Class</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={th}></th></tr></thead>
                <tbody>
                  {rows.map((b, i) => {
                    const dl = dueLabel(b);
                    return (
                      <tr key={b.id} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                        <td style={{ ...td, color: C.text, fontWeight: 600 }}>{b.docNumber ?? "—"}</td>
                        <td style={{ ...td, color: C.textMuted }}>{fmtDate(b.txnDate)}</td>
                        <td style={{ ...td, color: C.textMuted }}>{fmtDate(b.dueDate)}</td>
                        <td style={{ ...td, color: dl.color, fontWeight: 600 }}>{dl.text}</td>
                        <td style={{ ...td, color: C.textMuted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={b.accounts.map(glLeaf).join(", ")}>{glDisplay(b.accounts)}</td>
                        <td style={{ ...td, color: C.textMuted }}>{classDisplay(b.classes)}</td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.text, fontWeight: 700 }}>{money(b.balanceCents)}</td>
                        <td style={{ ...td, textAlign: "right" }}><ViewButton id={b.id} busy={viewBusy === b.id} onView={onView} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AutoPayModal({ allVendors, selected, onClose, onSave }: { allVendors: string[]; selected: Set<string>; onClose: () => void; onSave: (v: string[]) => Promise<void> }) {
  const [picked, setPicked] = React.useState<Set<string>>(new Set(selected));
  const [q, setQ] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const query = q.trim().toLowerCase();
  const list = query ? allVendors.filter((v) => v.toLowerCase().includes(query)) : allVendors;

  async function submit() {
    setSaving(true);
    try { await onSave([...picked]); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 70 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, width: "min(520px, 100%)", maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Auto-pay vendors</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Check vendors that draft our account (no check cut) — they can be hidden from AP Aging.</div>
          </div>
          <button onClick={onClose} style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", color: C.textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div className="inline-flex items-center" style={{ gap: 8, width: "100%", padding: "6px 10px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <Search size={14} style={{ color: C.textDim }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors…" autoFocus style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: C.text }} />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {list.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: C.textDim }}>No vendors match.</div>
          ) : (
            list.map((v, i) => {
              const on = picked.has(v);
              return (
                <button key={v} onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(v)) n.delete(v); else n.add(v); return n; })} className="flex items-center" style={{ gap: 10, width: "100%", textAlign: "left", padding: "8px 16px", border: "none", borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.bgAlt : C.bg, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? C.accent : C.borderStrong}`, background: on ? C.accent : C.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <Check size={12} color="#ffffff" />}
                  </span>
                  <span style={{ fontSize: 13, color: C.text }}>{v}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>{picked.size} on auto pay</span>
          <span className="inline-flex items-center" style={{ gap: 8 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Cancel</button>
            <button onClick={submit} disabled={saving} className="inline-flex items-center" style={{ gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#ffffff", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              <Check size={15} /> {saving ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 70 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, width: "min(920px, 100%)", height: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Invoice</span>
          <span className="inline-flex items-center" style={{ gap: 10 }}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center" style={{ gap: 4, fontSize: 12, color: C.accent, fontWeight: 600 }}><ExternalLink size={13} /> Open in new tab</a>
            <button onClick={onClose} style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", color: C.textMuted }}><X size={18} /></button>
          </span>
        </div>
        <iframe src={url} title="Invoice" style={{ flex: 1, width: "100%", border: "none", background: C.bgAlt }} />
      </div>
    </div>
  );
}
