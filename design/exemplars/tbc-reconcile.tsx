"use client";

import * as React from "react";
import { Upload, LayoutDashboard, ClipboardList, History, AlertTriangle, X, Download, RefreshCw } from "lucide-react";

import { C } from "@/components/accounting/palette";
import { buildPaymentSchedule } from "@/lib/accounting/ap/teabevco/reconcile-dashboard";

// TeaBevCo statement reconcile — upload the weekly "TBC Raw" tab and compare it against
// QuickBooks' open TeaBevCo bills (pulled live). Read-only: it flags invoices missing
// from QBO and amount mismatches so nothing slips through the 30-day payable window.
// Nothing posts to QBO. Runs are saved to history. Mirrors the ReconcileInvoices macro.

interface Summary {
  cutoffDate: string | null;
  today: string;
  tbcCount: number;
  tbcTotalCents: number;
  qboCount: number;
  qboTotalCents: number;
  differenceCents: number;
  missingCount: number;
  missingTotalCents: number;
  extraCount: number;
  extraTotalCents: number;
  mismatchCount: number;
  mismatchDiffCents: number;
}
interface MissingRow { location: string; date: string; invoiceNum: string; amountCents: number }
interface ExtraRow { billNo: string; dueDate: string | null; amountCents: number }
interface MismatchRow { invoiceNum: string; location: string; tbcAmountCents: number; qboAmountCents: number; differenceCents: number }
interface Result { summary: Summary; missing: MissingRow[]; extra: ExtraRow[]; mismatch: MismatchRow[]; dueByDate?: Record<string, number> }
interface RunSummary {
  id: string;
  createdAt: string;
  uploadFilename: string | null;
  runDate: string;
  cutoffDate: string | null;
  tbcCount: number;
  tbcTotalCents: number;
  qboCount: number;
  qboTotalCents: number;
  differenceCents: number;
  missingCount: number;
  missingTotalCents: number;
  extraCount: number;
  mismatchCount: number;
  mismatchDiffCents: number;
  hasFile: boolean;
}

const money = (cents: number): string => {
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  const s = `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return neg ? `(${s})` : s;
};
const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

export function TbcReconcile() {
  const [view, setView] = React.useState<"dashboard" | "analysis" | "history">("dashboard");
  const [current, setCurrent] = React.useState<Result | null>(null);
  const [runs, setRuns] = React.useState<RunSummary[]>([]);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadRuns = React.useCallback(async () => {
    try {
      const res = await fetch("/api/accounting/ap/teabevco/reconcile/runs", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setRuns(json.runs as RunSummary[]);
    } catch {
      /* history is best-effort */
    }
  }, []);

  const loadRun = React.useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/accounting/ap/teabevco/reconcile/runs/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Couldn't load that run");
      setCurrent({ summary: json.summary, missing: json.missing, extra: json.extra, mismatch: json.mismatch, dueByDate: json.dueByDate });
      setView("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that run");
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await loadRuns();
    })();
  }, [loadRuns]);

  // Auto-load the most recent run once on first history fetch (if nothing shown yet).
  React.useEffect(() => {
    if (!current && runs.length > 0) void loadRun(runs[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  async function rerun(id: string) {
    setError(null);
    const res = await fetch(`/api/accounting/ap/teabevco/reconcile/runs/${id}/rerun`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Re-run failed");
      throw new Error(json?.error ?? "Re-run failed");
    }
    setCurrent({ summary: json.summary, missing: json.missing, extra: json.extra, mismatch: json.mismatch, dueByDate: json.dueByDate });
    setView("dashboard");
    await loadRuns();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRunning(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/accounting/ap/teabevco/reconcile/run", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Run failed");
      setCurrent({ summary: json.summary, missing: json.missing, extra: json.extra, mismatch: json.mismatch, dueByDate: json.dueByDate });
      setView("dashboard");
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>TeaBevCo Reconcile</div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 620 }}>
            Upload Edmond&apos;s weekly <strong>TBC Raw</strong> statement, then Run Analysis to compare it against QuickBooks&apos; open TeaBevCo bills — catching invoices we
            haven&apos;t entered and any amount mismatches. Read-only; nothing posts to QuickBooks.
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" style={{ display: "none" }} onChange={onUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={running}
            className="inline-flex items-center"
            style={{ gap: 8, padding: "9px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#ffffff", fontSize: 13, fontWeight: 700, opacity: running ? 0.6 : 1 }}
          >
            <Upload size={16} className={running ? "animate-pulse" : undefined} /> {running ? "Running analysis…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between" style={{ padding: "8px 12px", borderRadius: 8, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 12 }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ border: "none", background: "transparent", color: C.red }}><X size={14} /></button>
        </div>
      )}

      <div className="inline-flex" style={{ gap: 4, padding: 4, borderRadius: 10, background: C.bgAlt, border: `1px solid ${C.border}`, alignSelf: "flex-start" }}>
        <Tab icon={<LayoutDashboard size={14} />} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <Tab icon={<ClipboardList size={14} />} label="Analysis" active={view === "analysis"} onClick={() => setView("analysis")} />
        <Tab icon={<History size={14} />} label={`History${runs.length ? ` · ${runs.length}` : ""}`} active={view === "history"} onClick={() => setView("history")} />
      </div>

      {view === "history" ? (
        <HistoryList runs={runs} onOpen={loadRun} onRerun={rerun} />
      ) : !current ? (
        <div style={{ padding: 24, borderRadius: 10, border: `1px dashed ${C.borderStrong}`, background: C.bgAlt, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
          No analysis yet — click <strong>Run Analysis</strong> and upload the TBC Raw tab to get started.
        </div>
      ) : view === "dashboard" ? (
        <Dashboard summary={current.summary} dueByDate={current.dueByDate} onJump={() => setView("analysis")} />
      ) : (
        <Analysis result={current} />
      )}
    </div>
  );
}

function Tab({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center"
      style={{ gap: 6, padding: "6px 12px", borderRadius: 7, border: "none", background: active ? C.bg : "transparent", color: active ? C.accent : C.textMuted, fontSize: 12, fontWeight: 700, boxShadow: active ? `0 1px 2px ${C.border}` : "none" }}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "default" | "red" | "blue" | "amber" }) {
  const map = {
    default: { bg: C.bg, border: C.border, color: C.text, labelColor: C.textDim },
    red: { bg: C.redBg, border: C.redBorder, color: C.red, labelColor: C.red },
    blue: { bg: C.accentBg, border: C.accentBorder, color: C.accent, labelColor: C.accent },
    amber: { bg: C.amberBg, border: C.amberBorder, color: C.amber, labelColor: C.amber },
  }[tone ?? "default"];
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: map.bg, border: `1px solid ${map.border}`, minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: map.labelColor }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: map.color, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ summary: s, dueByDate, onJump }: { summary: Summary; dueByDate?: Record<string, number>; onJump: () => void }) {
  const flagged = s.missingCount + s.mismatchCount;
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div
        className="flex items-center"
        style={{ gap: 8, padding: "10px 14px", borderRadius: 10, background: flagged ? C.amberBg : C.greenBg, border: `1px solid ${flagged ? C.amberBorder : C.greenBorder}`, color: flagged ? C.amber : C.green, fontSize: 13, fontWeight: 700 }}
      >
        {flagged ? <AlertTriangle size={16} /> : null}
        {flagged
          ? `${s.missingCount} missing from QBO and ${s.mismatchCount} amount mismatch${s.mismatchCount === 1 ? "" : "es"} — review the Analysis tab.`
          : "All statement invoices are in QuickBooks at matching amounts."}
        {flagged ? (
          <button onClick={onJump} style={{ marginLeft: "auto", border: "none", background: "transparent", color: C.amber, fontWeight: 800, fontSize: 12, textDecoration: "underline" }}>Open Analysis →</button>
        ) : null}
      </div>

      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <StatCard label="TBC Statement" value={money(s.tbcTotalCents)} sub={`${s.tbcCount} invoices`} />
        <StatCard label="QBO Open Bills" value={money(s.qboTotalCents)} sub={`${s.qboCount} bills`} />
        <StatCard label="Difference (TBC − QBO)" value={money(s.differenceCents)} tone={s.differenceCents !== 0 ? "amber" : "default"} />
      </div>
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <StatCard label="Missing from QBO" value={String(s.missingCount)} sub={money(s.missingTotalCents)} tone="red" />
        <StatCard label="Extra in QBO" value={String(s.extraCount)} sub={money(s.extraTotalCents)} tone="blue" />
        <StatCard label="Amount Mismatches" value={String(s.mismatchCount)} sub={money(s.mismatchDiffCents)} tone="amber" />
      </div>
      <div style={{ fontSize: 11, color: C.textDim }}>
        Cutoff {fmtDate(s.cutoffDate)} (earliest QBO bill date) · statement invoices with a due date after {fmtDate(s.today)}.
      </div>

      <PaymentScheduleSection dueByDate={dueByDate} />
    </div>
  );
}

// Forward payment forecast (Net-30 ACH draft schedule) — a port of the workbook's
// Dashboard tab. Always starts at today. By-day, by-week (Sun–Sat, labeled by Saturday),
// and a total. Computed client-side from the run's due-date totals, relative to today.
function PaymentScheduleSection({ dueByDate }: { dueByDate?: Record<string, number> }) {
  const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
  const sched = React.useMemo(() => buildPaymentSchedule(dueByDate ?? {}, today), [dueByDate, today]);
  if (!dueByDate) return null;

  const dowLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

  return (
    <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Payment schedule</div>
      <div style={{ fontSize: 11, color: C.textDim, marginTop: -4 }}>
        TeaBevCo ACH drafts (Net-30) from today forward · 8 weeks · {money(sched.totalCents)} outstanding.
      </div>
      <div className="flex flex-wrap" style={{ gap: 12, alignItems: "flex-start" }}>
        {/* By week */}
        <div style={{ flex: "1 1 260px", minWidth: 240, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: C.accent, background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>By Week (Sun–Sat)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "inherit" }}>
            <thead><tr><th style={th}>Week ending</th><th style={{ ...th, textAlign: "right" }}>TBC Draft</th></tr></thead>
            <tbody>
              {sched.byWeek.map((w, i) => (
                <tr key={w.weekEnding} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                  <td style={{ ...td, color: C.text }}>{fmtDate(w.weekEnding)}</td>
                  <td style={{ ...tdNum, color: w.amountCents ? C.text : C.textDim, fontWeight: w.amountCents ? 700 : 400 }}>{w.amountCents ? money(w.amountCents) : "—"}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 800, color: C.text, borderTop: `2px solid ${C.borderStrong}` }}>Total outstanding</td>
                <td style={{ ...tdNum, fontWeight: 800, color: C.accent, borderTop: `2px solid ${C.borderStrong}` }}>{money(sched.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* By day */}
        <div style={{ flex: "1 1 260px", minWidth: 240, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 420, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: C.accent, background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>By Day</div>
          <div style={{ overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "inherit" }}>
              <thead><tr><th style={th}>Day</th><th style={{ ...th, textAlign: "right" }}>TBC Amount</th></tr></thead>
              <tbody>
                {sched.byDay.map((d, i) => (
                  <tr key={d.date} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                    <td style={{ ...td, color: d.amountCents ? C.text : C.textDim }}>{dowLabel(d.date)} {fmtDate(d.date)}</td>
                    <td style={{ ...tdNum, color: d.amountCents ? C.text : C.textDim, fontWeight: d.amountCents ? 700 : 400 }}>{d.amountCents ? money(d.amountCents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textDim, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}` };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

function Section({ title, tone, count, children }: { title: string; tone: "red" | "blue" | "amber"; count: number; children: React.ReactNode }) {
  const color = tone === "red" ? C.red : tone === "blue" ? C.accent : C.amber;
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 800, color, background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>{title} · {count}</div>
      {count === 0 ? (
        <div style={{ padding: "10px 12px", fontSize: 12, color: C.textDim }}>None.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>{children}</div>
      )}
    </div>
  );
}

function Analysis({ result }: { result: Result }) {
  const { missing, extra, mismatch } = result;
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Section title="Missing from QBO" tone="red" count={missing.length}>
        <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontFamily: "inherit" }}>
          <thead><tr><th style={th}>Location</th><th style={th}>Date</th><th style={th}>Invoice #</th><th style={{ ...th, textAlign: "right" }}>Amount</th></tr></thead>
          <tbody>
            {missing.map((m, i) => (
              <tr key={`${m.invoiceNum}-${i}`} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                <td style={{ ...td, color: C.text }}>{m.location || "—"}</td>
                <td style={{ ...td, color: C.textMuted }}>{m.date || "—"}</td>
                <td style={{ ...td, color: C.text, fontWeight: 700 }}>{m.invoiceNum}</td>
                <td style={{ ...tdNum, color: C.red }}>{money(m.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Extra in QBO (not on statement)" tone="blue" count={extra.length}>
        <table style={{ width: "100%", minWidth: 380, borderCollapse: "collapse", fontFamily: "inherit" }}>
          <thead><tr><th style={th}>Bill No.</th><th style={th}>Due Date</th><th style={{ ...th, textAlign: "right" }}>Amount</th></tr></thead>
          <tbody>
            {extra.map((e, i) => (
              <tr key={`${e.billNo}-${i}`} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                <td style={{ ...td, color: C.text, fontWeight: 700 }}>{e.billNo}</td>
                <td style={{ ...td, color: C.textMuted }}>{fmtDate(e.dueDate)}</td>
                <td style={{ ...tdNum, color: C.accent }}>{money(e.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Amount Mismatches" tone="amber" count={mismatch.length}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontFamily: "inherit" }}>
          <thead><tr><th style={th}>Invoice #</th><th style={th}>Location</th><th style={{ ...th, textAlign: "right" }}>TBC</th><th style={{ ...th, textAlign: "right" }}>QBO</th><th style={{ ...th, textAlign: "right" }}>Difference</th></tr></thead>
          <tbody>
            {mismatch.map((m, i) => (
              <tr key={`${m.invoiceNum}-${i}`} style={{ background: i % 2 ? C.bgAlt : C.bg }}>
                <td style={{ ...td, color: C.text, fontWeight: 700 }}>{m.invoiceNum}</td>
                <td style={{ ...td, color: C.textMuted }}>{m.location || "—"}</td>
                <td style={tdNum}>{money(m.tbcAmountCents)}</td>
                <td style={tdNum}>{money(m.qboAmountCents)}</td>
                <td style={{ ...tdNum, color: C.amber, fontWeight: 700 }}>{money(m.differenceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function HistoryList({ runs, onOpen, onRerun }: { runs: RunSummary[]; onOpen: (id: string) => void; onRerun: (id: string) => Promise<void> }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rerunning, setRerunning] = React.useState<string | null>(null);

  async function download(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/accounting/ap/teabevco/reconcile/runs/${id}/file`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.url) window.open(json.url, "_blank", "noopener");
    } finally {
      setBusy(null);
    }
  }

  async function rerun(id: string) {
    setRerunning(id);
    try {
      await onRerun(id);
    } catch {
      /* parent surfaces the error */
    } finally {
      setRerunning(null);
    }
  }

  if (runs.length === 0) {
    return <div style={{ padding: 24, borderRadius: 10, border: `1px dashed ${C.borderStrong}`, background: C.bgAlt, color: C.textMuted, fontSize: 13, textAlign: "center" }}>No saved runs yet.</div>;
  }
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontFamily: "inherit" }}>
          <thead><tr><th style={th}>Run</th><th style={th}>File</th><th style={{ ...th, textAlign: "right" }}>Missing</th><th style={{ ...th, textAlign: "right" }}>Extra</th><th style={{ ...th, textAlign: "right" }}>Mismatch</th><th style={{ ...th, textAlign: "right" }}>Difference</th><th style={th}></th></tr></thead>
          <tbody>
            {runs.map((r, i) => (
              <tr key={r.id} onClick={() => onOpen(r.id)} style={{ background: i % 2 ? C.bgAlt : C.bg, cursor: "pointer" }}>
                <td style={{ ...td, color: C.text, whiteSpace: "nowrap" }}>{new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td style={{ ...td, color: C.textMuted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.uploadFilename ?? "—"}</td>
                <td style={{ ...tdNum, color: r.missingCount ? C.red : C.textDim, fontWeight: r.missingCount ? 700 : 400 }}>{r.missingCount}</td>
                <td style={{ ...tdNum, color: r.extraCount ? C.accent : C.textDim }}>{r.extraCount}</td>
                <td style={{ ...tdNum, color: r.mismatchCount ? C.amber : C.textDim, fontWeight: r.mismatchCount ? 700 : 400 }}>{r.mismatchCount}</td>
                <td style={tdNum}>{money(r.differenceCents)}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {r.hasFile ? (
                    <span className="inline-flex items-center" style={{ gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); void rerun(r.id); }}
                        title="Re-run this file against QuickBooks' current open bills"
                        className="inline-flex items-center"
                        style={{ gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.accentBorder}`, background: C.accentBg, color: C.accent, fontSize: 11, fontWeight: 600, opacity: rerunning === r.id ? 0.6 : 1 }}
                      >
                        <RefreshCw size={12} className={rerunning === r.id ? "animate-spin" : undefined} /> {rerunning === r.id ? "…" : "Re-run"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void download(r.id); }}
                        title="Download the uploaded file"
                        className="inline-flex items-center"
                        style={{ gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.accent, fontSize: 11, fontWeight: 600, opacity: busy === r.id ? 0.6 : 1 }}
                      >
                        <Download size={12} /> {busy === r.id ? "…" : "File"}
                      </button>
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: C.textDim }} title="No saved file — upload the statement again to run it">no file</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
