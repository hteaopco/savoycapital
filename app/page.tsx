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
function buildSchedule() {
  const monthlyRate = ANNUAL_RATE / 12;
  const totalMonths = AMORT_YEARS * 12;
  // Fixed monthly payment on 10yr amortization
  const monthlyPayment = PRINCIPAL * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const rows = [];
  let balance = PRINCIPAL;
  // Month 0
  rows.push({
    month: 0,
    investment: -PRINCIPAL,
    dealFee: 0,
    interest: 0,
    totalReturn: 0,
    prinReturned: 0,
    globalReturn: -PRINCIPAL,
  });
  const dealFeeMonth1 = PRINCIPAL * FEE_RATE;
  for (let m = 1; m <= MONTHS; m++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    const dealFee = m === 1 ? dealFeeMonth1 : 0;
    const totalReturn = interest + dealFee;
    const globalReturn = totalReturn + principal;
    balance -= principal;
    rows.push({
      month: m,
      investment: 0,
      dealFee,
      interest,
      totalReturn,
      prinReturned: principal,
      globalReturn,
    });
  }
  // Add balloon — remaining balance returned at month 12
  rows[MONTHS].prinReturned += balance;
  rows[MONTHS].globalReturn += balance;
  return rows;
}
// --- Components ---
function ReturnProfile() {
  const [open, setOpen] = useState(false);
  const schedule = buildSchedule();
  const totals = schedule.slice(1).reduce((acc, r) => ({
    dealFee: acc.dealFee + r.dealFee,
    interest: acc.interest + r.interest,
    totalReturn: acc.totalReturn + r.totalReturn,
    prinReturned: acc.prinReturned + r.prinReturned,
    globalReturn: acc.globalReturn + r.globalReturn,
  }), { dealFee: 0, interest: 0, totalReturn: 0, prinReturned: 0, globalReturn: 0 });
  const irrCashflows = schedule.map(r => r.globalReturn);
  const monthlyIRR = computeIRR(irrCashflows);
  const annualIRR = Math.pow(1 + monthlyIRR, 12) - 1;
  const cols = ["Month", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return"];
  const colWidths = "60px 110px 90px 90px 110px 110px 110px";
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px",
        background: "rgba(251,191,36,0.05)",
        border: "1px solid rgba(251,191,36,0.15)",
        borderRadius: open ? "8px 8px 0 0" : 8,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#b45309" }}>
          Return Profile
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
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
                  letterSpacing: ".08em", color: "#94a3b8", whiteSpace: "nowrap",
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
                <span style={cellStyle}>{r.month === 0 ? "0" : r.month}</span>
                <span style={{ ...cellStyle, color: r.investment < 0 ? "#f87171" : "#0f172a" }}>
                  {r.investment !== 0 ? fmt(r.investment) : "—"}
                </span>
                <span style={cellStyle}>{r.dealFee > 0 ? fmt(r.dealFee) : "—"}</span>
                <span style={cellStyle}>{r.interest > 0 ? fmt(r.interest) : "—"}</span>
                <span style={{ ...cellStyle, color: r.totalReturn > 0 ? "#16a34a" : "#0f172a" }}>
                  {r.totalReturn > 0 ? fmt(r.totalReturn) : "—"}
                </span>
                <span style={cellStyle}>{r.prinReturned > 0 ? fmt(r.prinReturned) : "—"}</span>
                <span style={{ ...cellStyle, fontWeight: 700, color: r.globalReturn < 0 ? "#f87171" : r.globalReturn > 0 ? "#16a34a" : "#0f172a" }}>
                  {fmt(r.globalReturn)}
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
              <span style={{ ...cellStyle, fontWeight: 700, color: "#16a34a" }}>{fmt(totals.totalReturn)}</span>
              <span style={{ ...cellStyle, fontWeight: 700 }}>{fmt(totals.prinReturned)}</span>
              <span style={{ ...cellStyle, fontWeight: 800, color: "#16a34a" }}>{fmt(totals.globalReturn)}</span>
            </div>
          </div>
          {/* IRR */}
          <div style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(74,222,128,0.03)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#64748b" }}>
              Annual IRR
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
              {(annualIRR * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
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
      {/* Investment header row */}
      <button onClick={() => setDealOpen(!dealOpen)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit",
        borderBottom: dealOpen ? "1px solid rgba(0,0,0,0.07)" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: ".08em",
            textTransform: "uppercase", color: "#94a3b8",
          }}>
            #001
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            HTeaO Bridge Loan
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)",
            color: "#38bdf8",
          }}>
            Active
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{dealOpen ? "▲" : "▼"}</span>
      </button>
      {/* Deal terms */}
      {dealOpen && (
        <div style={{ padding: "16px 20px" }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".1em", color: "#38bdf8", marginBottom: 12,
          }}>
            Deal Terms
          </p>
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
                padding: "8px 12px",
                background: "rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 8,
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
      id: "#001",
      name: "HTeaO Bridge Loan",
      deployed: "05/01/26",
      amount: "$1,010,000",
      rate: "10%",
      amort: "10yr",
      balloon: "05/01/27",
      monthlyPI: "$13,347",
      totalReturn: "$1,121,162",
      irr: "11.01%",
      status: "Active",
    },
  ];
  const headers = ["#", "Deal", "Deployed", "Amount", "Rate", "Amort", "Balloon", "Mo. P&I", "Total Return", "IRR", "Status"];
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
      {/* Top Nav */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        padding: "0 20px",
        height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Left — nav links */}
        <nav className="desktop-nav" style={{ display: "flex", gap: 20 }}>
          <a href="#" style={navLinkStyle}>Dashboard</a>
        </nav>
        {/* Right — fund name */}
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: ".06em",
          textTransform: "uppercase", color: "#0f172a",
        }}>
          Savoy Capital Fund
        </span>
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 5, padding: 4,
          }}
          aria-label="Toggle menu"
        >
          <span style={barStyle(menuOpen, "top")} />
          <span style={barStyle(menuOpen, "mid")} />
          <span style={barStyle(menuOpen, "bot")} />
        </button>
      </header>
      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu" style={{
          position: "fixed", top: 52, left: 0, right: 0, zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "12px 20px 16px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <a href="#" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>Dashboard</a>
        </div>
      )}
      {/* Main */}
      <main style={{ paddingTop: 52 }}>
        {/* Hero */}
        <section style={{
          padding: "48px 24px 40px",
          maxWidth: 760, margin: "0 auto",
        }}>
          <h1 style={{
            fontSize: "clamp(28px, 7vw, 44px)",
            fontWeight: 800, letterSpacing: "-.02em",
            color: "#0f172a", marginBottom: 32, lineHeight: 1.1,
          }}>
            Savoy Capital Fund
          </h1>
          {/* Current Investments toggle */}
          <button
            onClick={() => setInvestOpen(!investOpen)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 8,
              fontSize: 12, fontWeight: 800,
              background: investOpen ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.10)",
              border: "1px solid rgba(56,189,248,0.35)",
              color: "#38bdf8", cursor: "pointer",
              transition: "all .15s", fontFamily: "inherit",
              marginBottom: investOpen ? 20 : 0,
            }}
          >
            Investment History {investOpen ? "▲" : "▼"}
          </button>
          {/* Investments dropdown */}
          {investOpen && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#94a3b8", marginBottom: 12 }}>
                Deal Level Breakdown
              </p>
              <InvestmentHistoryTable />
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
// Shared styles
const navLinkStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: "#64748b", textDecoration: "none",
};
const mobileNavLinkStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#0f172a", textDecoration: "none",
  padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
};
const cellStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: "#0f172a",
  fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 14px", fontSize: 12, color: "#334155",
  fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};
function barStyle(open: boolean, pos: "top" | "mid" | "bot"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "block", width: 20, height: 2,
    background: "#0f172a", borderRadius: 2, transition: "all .2s",
  };
  if (open && pos === "top") return { ...base, transform: "translateY(7px) rotate(45deg)" };
  if (open && pos === "mid") return { ...base, opacity: 0 };
  if (open && pos === "bot") return { ...base, transform: "translateY(-7px) rotate(-45deg)" };
  return base;
}
