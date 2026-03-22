"use client";
import { useState } from "react";
// --- IRR Calculator ---
function computeIRR(cashflows: number[]): number {
  let rate = 0.1;
  for (let i = 0; i < 1000; i++) {
    let npv = 0, dNpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
      dNpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < 1e-8) return newRate;
    rate = newRate;
  }
  return rate;
}
function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
// --- Deal constants ---
const PRINCIPAL = 1_010_000;
const ANNUAL_RATE = 0.10;
const FEE_RATE = 0.01;
const AMORT_YEARS = 10;
const MONTHS = 12;
const MM_ANNUAL_RATE = 0.035;
function buildSchedule() {
  const monthlyRate = ANNUAL_RATE / 12;
  const mmMonthlyRate = MM_ANNUAL_RATE / 12;
  const totalMonths = AMORT_YEARS * 12;
  const monthlyPayment = PRINCIPAL * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const rows: {
    month: number; investment: number; dealFee: number; interest: number;
    totalReturn: number; prinReturned: number; globalReturn: number;
    mmDeposit: number; mmInterest: number; mmBalance: number; globalReturnMM: number;
    runningIRR: number; runningIRRMM: number;
  }[] = [];
  let balance = PRINCIPAL;
  let mmBalance = 0;
  const dealFeeMonth1 = PRINCIPAL * FEE_RATE;
  // Base cashflows built incrementally for running IRR
  const baseCFs = [-PRINCIPAL];
  const baseCFsMM = [-PRINCIPAL];
  rows.push({
    month: 0, investment: -PRINCIPAL, dealFee: 0, interest: 0,
    totalReturn: 0, prinReturned: 0, globalReturn: -PRINCIPAL,
    mmDeposit: 0, mmInterest: 0, mmBalance: 0, globalReturnMM: -PRINCIPAL,
    runningIRR: 0, runningIRRMM: 0,
  });
  for (let m = 1; m <= MONTHS; m++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    const dealFee = m === 1 ? dealFeeMonth1 : 0;
    const totalReturn = interest + dealFee;
    const globalReturn = totalReturn + principal;
    balance -= principal;
    const mmInterest = mmBalance * mmMonthlyRate;
    mmBalance = mmBalance + mmInterest + totalReturn;
    // Running IRR: hypothetical exit this month returning remaining balance
    const exitCF = globalReturn + balance;
    const exitCFMM = exitCF + mmInterest;
    const monthlyIRR = computeIRR([...baseCFs, exitCF]);
    const monthlyIRRMM = computeIRR([...baseCFsMM, exitCFMM]);
    const runningIRR = Math.pow(1 + monthlyIRR, 12) - 1;
    const runningIRRMM = Math.pow(1 + monthlyIRRMM, 12) - 1;
    rows.push({
      month: m, investment: 0, dealFee, interest, totalReturn,
      prinReturned: principal, globalReturn,
      mmDeposit: totalReturn, mmInterest, mmBalance, globalReturnMM: globalReturn + mmInterest,
      runningIRR, runningIRRMM,
    });
    baseCFs.push(globalReturn);
    baseCFsMM.push(globalReturn + mmInterest);
  }
  // Actual balloon at month 12
  rows[MONTHS].prinReturned += balance;
  rows[MONTHS].globalReturn += balance;
  rows[MONTHS].globalReturnMM = rows[MONTHS].globalReturn + rows[MONTHS].mmInterest;
  return rows;
}
// --- Components ---
function ReturnProfile() {
  const [mmOn, setMmOn] = useState(true);
  const schedule = buildSchedule();
  const totals = schedule.slice(1).reduce((acc, r) => ({
    dealFee: acc.dealFee + r.dealFee,
    interest: acc.interest + r.interest,
    totalReturn: acc.totalReturn + r.totalReturn,
    prinReturned: acc.prinReturned + r.prinReturned,
    globalReturn: acc.globalReturn + r.globalReturn,
    mmInterest: acc.mmInterest + r.mmInterest,
  }), { dealFee: 0, interest: 0, totalReturn: 0, prinReturned: 0, globalReturn: 0, mmInterest: 0 });
  const irrCashflows = schedule.map(r => r.globalReturn);
  const annualIRR = Math.pow(1 + computeIRR(irrCashflows), 12) - 1;
  const irrMMCashflows = schedule.map(r => r.globalReturn + r.mmInterest);
  const annualIRRMM = Math.pow(1 + computeIRR(irrMMCashflows), 12) - 1;
  const displayIRR = mmOn ? annualIRRMM : annualIRR;

  const cols = mmOn
    ? ["Month", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Deposit (3.5%)", "MM Interest", "Global Return w/ MM", "Running IRR"]
    : ["Month", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Deposit (3.5%)", "MM Interest", "Global Return w/ MM", "Running IRR"];
  const colWidths = "50px 110px 90px 90px 110px 110px 120px 130px 100px 140px 90px";

  return (
    <div style={{ marginTop: 12 }}>
      {/* Header bar with MM toggle cards */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(251,191,36,0.05)",
        border: "1px solid rgba(251,191,36,0.15)",
        borderRadius: "8px 8px 0 0",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#b45309" }}>
          Return Profile
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#94a3b8", marginRight: 4 }}>MM Reinvest</span>
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setMmOn(val)}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", border: "none",
                background: mmOn === val
                  ? val ? "rgba(22,163,74,0.15)" : "rgba(248,113,113,0.15)"
                  : "rgba(0,0,0,0.04)",
                color: mmOn === val
                  ? val ? "#16a34a" : "#dc2626"
                  : "#94a3b8",
                outline: mmOn === val
                  ? val ? "1px solid rgba(22,163,74,0.3)" : "1px solid rgba(220,38,38,0.3)"
                  : "1px solid transparent",
                transition: "all .15s",
              }}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        border: "1px solid rgba(0,0,0,0.07)", borderTop: "none",
        borderRadius: "0 0 8px 8px", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: colWidths,
            padding: "6px 14px",
            background: "rgba(56,189,248,0.05)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            minWidth: "fit-content",
          }}>
            {cols.map(c => (
              <span key={c} style={{
                fontSize: 8, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".08em",
                color: c === "Total Return" ? "#16a34a" : "#94a3b8",
                whiteSpace: "nowrap",
                background: c === "Total Return" ? "rgba(22,163,74,0.08)" : "transparent",
                padding: c === "Total Return" ? "2px 4px" : undefined,
                borderRadius: c === "Total Return" ? 3 : undefined,
              }}>{c}</span>
            ))}
          </div>
          {/* Rows */}
          {schedule.map((r, idx) => (
            <div key={r.month} style={{
              display: "grid", gridTemplateColumns: colWidths,
              padding: "8px 14px", alignItems: "center",
              borderBottom: "1px solid rgba(0,0,0,0.04)",
              background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
              minWidth: "fit-content",
            }}>
              <span style={cellStyle}>{r.month}</span>
              <span style={{ ...cellStyle, color: r.investment < 0 ? "#f87171" : "#0f172a" }}>
                {r.investment !== 0 ? fmt(r.investment) : "—"}
              </span>
              <span style={cellStyle}>{r.dealFee > 0 ? fmt(r.dealFee) : "—"}</span>
              <span style={cellStyle}>{r.interest > 0 ? fmt(r.interest) : "—"}</span>
              {/* Total Return — bold, light green bg */}
              <span style={{
                ...cellStyle, fontWeight: 800,
                color: r.totalReturn > 0 ? "#15803d" : "#0f172a",
                background: r.totalReturn > 0 ? "rgba(22,163,74,0.08)" : "transparent",
                padding: "2px 4px", borderRadius: 3,
              }}>
                {r.totalReturn > 0 ? fmt(r.totalReturn) : "—"}
              </span>
              <span style={cellStyle}>{r.prinReturned > 0 ? fmt(r.prinReturned) : "—"}</span>
              <span style={{ ...cellStyle, fontWeight: 700, color: r.globalReturn < 0 ? "#f87171" : r.globalReturn > 0 ? "#16a34a" : "#0f172a" }}>
                {fmt(r.globalReturn)}
              </span>
              {/* MM Deposit */}
              <span style={{ ...cellStyle, color: mmOn ? "#0f172a" : "#cbd5e1" }}>
                {r.mmDeposit > 0 ? fmt(r.mmDeposit) : "—"}
              </span>
              {/* MM Interest */}
              <span style={{ ...cellStyle, color: mmOn ? "#16a34a" : "#cbd5e1", fontWeight: mmOn ? 600 : 400 }}>
                {r.mmInterest > 0 ? fmt(r.mmInterest) : "—"}
              </span>
              {/* Global Return w/ MM */}
              <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? (r.globalReturnMM < 0 ? "#f87171" : r.globalReturnMM > 0 ? "#16a34a" : "#0f172a") : "#cbd5e1" }}>
                {mmOn ? fmt(r.globalReturnMM) : "—"}
              </span>
              {/* Running IRR */}
              <span style={{ ...cellStyle, fontWeight: 700, color: r.month === 0 ? "#0f172a" : "#0ea5e9" }}>
                {r.month === 0 ? "—" : `${((mmOn ? r.runningIRRMM : r.runningIRR) * 100).toFixed(2)}%`}
              </span>
            </div>
          ))}
          {/* Totals */}
          <div style={{
            display: "grid", gridTemplateColumns: colWidths,
            padding: "8px 14px",
            background: "rgba(56,189,248,0.04)",
            borderTop: "2px solid rgba(56,189,248,0.2)",
            minWidth: "fit-content",
          }}>
            <span style={{ ...cellStyle, color: "#38bdf8", fontWeight: 800 }}>Total</span>
            <span style={cellStyle}>—</span>
            <span style={{ ...cellStyle, fontWeight: 700 }}>{fmt(totals.dealFee)}</span>
            <span style={{ ...cellStyle, fontWeight: 700 }}>{fmt(totals.interest)}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: "#15803d", background: "rgba(22,163,74,0.08)", padding: "2px 4px", borderRadius: 3 }}>{fmt(totals.totalReturn)}</span>
            <span style={{ ...cellStyle, fontWeight: 700 }}>{fmt(totals.prinReturned)}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: "#16a34a" }}>{fmt(totals.globalReturn)}</span>
            <span style={{ ...cellStyle, fontWeight: 700, color: mmOn ? "#0f172a" : "#cbd5e1" }}>{mmOn ? fmt(totals.totalReturn) : "—"}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? "#16a34a" : "#cbd5e1" }}>{mmOn ? fmt(totals.mmInterest) : "—"}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? "#16a34a" : "#cbd5e1" }}>{mmOn ? fmt(totals.globalReturn + totals.mmInterest) : "—"}</span>
            <span style={cellStyle}>—</span>
          </div>
        </div>
        {/* IRR Footer */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(74,222,128,0.03)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#64748b" }}>
            {mmOn ? "IRR w/ MM Reinvest" : "Annual IRR"}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
            {(displayIRR * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
function InvestmentCard() {
  const [dealOpen, setDealOpen] = useState(false);
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12, overflow: "hidden",
      marginBottom: 8,
    }}>
      <button onClick={() => setDealOpen(!dealOpen)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit",
        borderBottom: dealOpen ? "1px solid rgba(0,0,0,0.07)" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#94a3b8" }}>#001</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>HTeaO Bridge Loan</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8" }}>Active</span>
        </div>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{dealOpen ? "▲" : "▼"}</span>
      </button>
      {dealOpen && (
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#38bdf8", marginBottom: 12 }}>Deal Terms</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {[
              ["Investment", "$1,010,000"],
              ["Structure", "12 Month Balloon"],
              ["Rate / Fee", "10% Rate · 1% Fee"],
              ["Extension", "+1% Fee if extended to 24 Months"],
              ["Amortization", "10 Year Schedule"],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8,
              }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span>
              </div>
            ))}
          </div>
          <ReturnProfile />
        </div>
      )}
    </div>
  );
}
function InvestmentHistoryTable() {
  const deals = [
    {
      id: "#001", name: "HTeaO Bridge Loan", deployed: "05/01/26",
      amount: "$1,010,000", rate: "10%", amort: "10yr", balloon: "05/01/27",
      monthlyPI: "$13,347", totalReturn: "$1,118,560", irr: "11.66%", irrMM: "11.88%", status: "Active",
    },
  ];
  const headers = ["#", "Deal", "Deployed", "Amount", "Rate", "Amort", "Balloon", "Mo. P&I", "Total Return", "IRR", "IRR w/ MM", "Status"];
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", background: "#ffffff", marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr style={{ background: "rgba(56,189,248,0.05)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            {headers.map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "#94a3b8", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr key={d.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)" }}>
              <td style={tdStyle}>{d.id}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: "#0f172a" }}>{d.name}</td>
              <td style={tdStyle}>{d.deployed}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{d.amount}</td>
              <td style={tdStyle}>{d.rate}</td>
              <td style={tdStyle}>{d.amort}</td>
              <td style={tdStyle}>{d.balloon}</td>
              <td style={tdStyle}>{d.monthlyPI}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: "#16a34a" }}>{d.totalReturn}</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: "#16a34a" }}>{d.irr}</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: "#16a34a" }}>{d.irrMM}</td>
              <td style={tdStyle}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8" }}>{d.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(248,250,252,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0 20px",
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <nav className="desktop-nav" style={{ display: "flex", gap: 20 }}>
          <a href="#" style={navLinkStyle}>Dashboard</a>
        </nav>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a" }}>
          Savoy Capital Fund
        </span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}
          aria-label="Toggle menu">
          <span style={barStyle(menuOpen, "top")} />
          <span style={barStyle(menuOpen, "mid")} />
          <span style={barStyle(menuOpen, "bot")} />
        </button>
      </header>
      {menuOpen && (
        <div className="mobile-menu" style={{
          position: "fixed", top: 52, left: 0, right: 0, zIndex: 40,
          background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 2,
        }}>
          <a href="#" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>Dashboard</a>
        </div>
      )}
      <main style={{ paddingTop: 52 }}>
        <section style={{ padding: "48px 24px 40px", maxWidth: 760, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f172a", marginBottom: 32, lineHeight: 1.1 }}>
            Savoy Capital Fund
          </h1>
          <button onClick={() => setInvestOpen(!investOpen)} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 24px", borderRadius: 8, fontSize: 12, fontWeight: 800,
            background: investOpen ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.10)",
            border: "1px solid rgba(56,189,248,0.35)", color: "#38bdf8", cursor: "pointer",
            transition: "all .15s", fontFamily: "inherit", marginBottom: investOpen ? 20 : 0,
          }}>
            Investment History {investOpen ? "▲" : "▼"}
          </button>
          {investOpen && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 12 }}>
                Active Positions
              </p>
              <InvestmentCard />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
const navLinkStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#64748b", textDecoration: "none" };
const mobileNavLinkStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a", textDecoration: "none", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" };
const cellStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#0f172a", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#334155", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
function barStyle(open: boolean, pos: "top" | "mid" | "bot"): React.CSSProperties {
  const base: React.CSSProperties = { display: "block", width: 20, height: 2, background: "#0f172a", borderRadius: 2, transition: "all .2s" };
  if (open && pos === "top") return { ...base, transform: "translateY(7px) rotate(45deg)" };
  if (open && pos === "mid") return { ...base, opacity: 0 };
  if (open && pos === "bot") return { ...base, transform: "translateY(-7px) rotate(-45deg)" };
  return base;
}
