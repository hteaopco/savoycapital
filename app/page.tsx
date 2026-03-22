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
    month: number | string; investment: number; dealFee: number; interest: number;
    totalReturn: number; prinReturned: number; globalReturn: number;
    mmDeposit: number; mmInterest: number; mmBalance: number; globalReturnMM: number;
    runningIRR: number; runningIRRMM: number; isBalloon?: boolean;
  }[] = [];
  let balance = PRINCIPAL;
  let mmBalance = 0;
  let mmCumDeposit = 0;
  const dealFeeMonth1 = PRINCIPAL * FEE_RATE;
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
    // Deposit globalReturn into MM each month 1-12
    mmBalance = mmBalance + mmInterest + globalReturn;
    mmCumDeposit += globalReturn;
    const exitCF = globalReturn + balance;
    const exitCFMM = exitCF + mmInterest;
    const monthlyIRR = computeIRR([...baseCFs, exitCF]);
    const monthlyIRRMM = computeIRR([...baseCFsMM, exitCFMM]);
    const runningIRR = Math.pow(1 + monthlyIRR, 12) - 1;
    const runningIRRMM = Math.pow(1 + monthlyIRRMM, 12) - 1;
    rows.push({
      month: m, investment: 0, dealFee, interest, totalReturn,
      prinReturned: principal, globalReturn,
      mmDeposit: mmCumDeposit, mmInterest, mmBalance, globalReturnMM: globalReturn + mmInterest,
      runningIRR, runningIRRMM,
    });
    baseCFs.push(globalReturn);
    baseCFsMM.push(globalReturn + mmInterest);
  }
  // Balloon row — remaining principal returned, no new MM deposit, MM earns final interest
  const mmInterestBalloon = mmBalance * mmMonthlyRate;
  mmBalance = mmBalance + mmInterestBalloon;
  rows.push({
    month: "Balloon", investment: 0, dealFee: 0, interest: 0,
    totalReturn: 0, prinReturned: balance, globalReturn: balance,
    mmDeposit: 0, mmInterest: mmInterestBalloon, mmBalance, globalReturnMM: balance + mmInterestBalloon,
    runningIRR: 0, runningIRRMM: 0, isBalloon: true,
  });
  return rows;
}
// --- Components ---

// --- Export Excel ---
function exportTableExcel(schedule: ReturnType<typeof buildSchedule>, mmOn: boolean, irr: number) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const headers = ["Month","Investment","Deal Fee","Interest","Total Return","Prin Returned","Global Return","MM Deposit Cum.","MM Interest","Global Return w/ MM","Running IRR"];
  const fmt = (n: number) => n;
  const rows = schedule.map(r => [
    r.month,
    r.investment !== 0 ? fmt(r.investment) : "",
    r.dealFee > 0 ? fmt(r.dealFee) : "",
    r.interest > 0 ? fmt(r.interest) : "",
    r.totalReturn > 0 ? fmt(r.totalReturn) : "",
    r.prinReturned > 0 ? fmt(r.prinReturned) : "",
    fmt(r.globalReturn),
    mmOn && r.mmDeposit > 0 ? fmt(r.mmDeposit) : "",
    mmOn && r.mmInterest > 0 ? fmt(r.mmInterest) : "",
    mmOn ? fmt(r.globalReturnMM) : "",
    r.month === 0 || r.isBalloon ? "" : `${((mmOn ? r.runningIRRMM : r.runningIRR) * 100).toFixed(2)}%`,
  ]);

  // Build CSV
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csvLines = [
    `Savoy Capital Fund — Return Profile Export`,
    `Generated: ${today}`,
    `MM Reinvestment: ${mmOn ? "ON (3.5%)" : "OFF"}`,
    `${mmOn ? "IRR w/ MM Reinvest" : "Annual IRR"}: ${(irr * 100).toFixed(2)}%`,
    ``,
    headers.map(escape).join(","),
    ...rows.map(r => r.map(escape).join(",")),
  ];

  const csv = csvLines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `savoy-return-profile-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


// --- Export PDF ---
function exportTablePDF(schedule: ReturnType<typeof buildSchedule>, mmOn: boolean, irr: number) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const cols = [
    { label: "Month", desc: "The month number of the deal. Month 0 is the initial investment date. Months 1–12 represent each calendar month of the 12-month balloon term." },
    { label: "Investment", desc: "Capital deployed. Month 0 shows the full principal as a negative (outflow). All subsequent months show no additional investment." },
    { label: "Deal Fee", desc: "A one-time 1% origination fee ($10,100) collected in Month 1. Income to the fund on top of interest." },
    { label: "Interest", desc: "Monthly interest at 10% per annum on the outstanding balance. Calculated as: Balance × (10% ÷ 12). Decreases slightly each month as principal amortizes." },
    { label: "Total Return", desc: "Total cash income per month — Interest + Deal Fee. The yield component of the investment, excluding principal repayment." },
    { label: "Principal Returned", desc: "Portion of each payment reducing the loan balance, based on a 10-year amortization schedule. At Month 12 the full remaining balloon balance is returned." },
    { label: "Global Return", desc: "Total cash received each month: Total Return + Principal Returned. Complete cashflow back to the fund. Month 0 is negative (capital out), Months 1–12 are positive." },
    { label: "MM Deposit Cum. (3.5%)", desc: "When MM Reinvestment is ON: the cumulative total of all Total Return deposits made into the Money Market account through that month, earning 3.5% annually." },
    { label: "MM Interest", desc: "Monthly interest earned on the accumulated MM balance at 3.5% per annum. Compounds each month as new deposits are added to the growing balance." },
    { label: "Global Return w/ MM", desc: "Global Return enhanced by MM interest earned that month — total economic value when income is reinvested." },
    { label: "Running IRR", desc: "Annualized IRR assuming the deal exits (balloon) at the end of that month. Higher in early months due to the deal fee. Converges to the terminal rate at Month 12." },
  ];

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const tableHeaders = mmOn
    ? ["Mo.", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Dep. Cum.", "MM Interest", "Global w/ MM", "Running IRR"]
    : ["Mo.", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Dep. Cum.", "MM Interest", "Global w/ MM", "Running IRR"];

  const tableRowsHTML = schedule.map((r, idx) => {
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const cells = [
      r.month,
      r.investment !== 0 ? fmt(r.investment) : "—",
      r.dealFee > 0 ? fmt(r.dealFee) : "—",
      r.interest > 0 ? fmt(r.interest) : "—",
      r.totalReturn > 0 ? fmt(r.totalReturn) : "—",
      r.prinReturned > 0 ? fmt(r.prinReturned) : "—",
      fmt(r.globalReturn),
      mmOn && r.mmDeposit > 0 ? fmt(r.mmDeposit) : "—",
      mmOn && r.mmInterest > 0 ? fmt(r.mmInterest) : "—",
      mmOn ? fmt(r.globalReturnMM) : "—",
      r.month === 0 ? "—" : `${((mmOn ? r.runningIRRMM : r.runningIRR) * 100).toFixed(2)}%`,
    ];
    return `<tr style="background:${bg}">${cells.map((c, i) => {
      const isRed = i === 1 && r.investment < 0;
      const isGreen = (i === 4 && r.totalReturn > 0) || (i === 6 && r.globalReturn > 0) || i === 8 || i === 9 || i === 10;
      const color = isRed ? "#dc2626" : isGreen ? "#16a34a" : "#1e293b";
      const bold = i === 4 || i === 6 || i === 9 || i === 10 ? "700" : "400";
      const bgCell = i === 4 && r.totalReturn > 0 ? "background:#f0fdf4;" : "";
      return `<td style="padding:5px 8px;font-size:10px;color:${color};font-weight:${bold};${bgCell}white-space:nowrap;border-bottom:1px solid #f1f5f9">${c}</td>`;
    }).join("")}</tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Savoy Capital Fund — Return Profile Export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1e293b; background: #fff; padding: 40px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #94a3b8; margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
  .irr-badge { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 16px; margin-bottom: 32px; }
  .irr-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #64748b; }
  .irr-val { font-size: 20px; font-weight: 800; color: #16a34a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 10px; }
  thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
  th { padding: 7px 8px; text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #94a3b8; white-space: nowrap; }
  .col-def { margin-bottom: 12px; }
  .col-name { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .col-desc { font-size: 11px; color: #64748b; line-height: 1.5; }
  .print-btn { margin-bottom: 24px; padding: 8px 20px; background: #0f172a; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">Print / Save as PDF</button>
<h1>Savoy Capital Fund</h1>
<div class="meta">Return Profile Export &nbsp;·&nbsp; Generated ${today} &nbsp;·&nbsp; MM Reinvestment: ${mmOn ? "ON (3.5%)" : "OFF"}</div>

<div class="irr-badge">
  <span class="irr-label">${mmOn ? "IRR w/ MM Reinvest" : "Annual IRR"}</span>
  <span class="irr-val">${(irr * 100).toFixed(2)}%</span>
</div>

<h2>Return Profile Table</h2>
<table>
  <thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${tableRowsHTML}</tbody>
</table>

<h2>Column Definitions</h2>
${cols.map(c => `<div class="col-def"><div class="col-name">${c.label}</div><div class="col-desc">${c.desc}</div></div>`).join("")}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function ReturnProfile() {
  const [mmOn, setMmOn] = useState(true);
  const schedule = buildSchedule();
  const regularRows = schedule.filter(r => !r.isBalloon);
  const balloonRow = schedule.find(r => r.isBalloon);
  const totals = regularRows.slice(1).reduce((acc, r) => ({
    dealFee: acc.dealFee + r.dealFee,
    interest: acc.interest + r.interest,
    totalReturn: acc.totalReturn + r.totalReturn,
    prinReturned: acc.prinReturned + r.prinReturned,
    globalReturn: acc.globalReturn + r.globalReturn,
    mmInterest: acc.mmInterest + r.mmInterest,
  }), { dealFee: 0, interest: 0, totalReturn: 0, prinReturned: 0, globalReturn: 0, mmInterest: 0 });
  const mmCumTotal = regularRows[regularRows.length - 1].mmDeposit;
  // IRR: regular rows + add balloon principal to final month cashflow
  const irrCashflows = regularRows.map(r => r.globalReturn);
  irrCashflows[irrCashflows.length - 1] += (balloonRow?.globalReturn ?? 0);
  const annualIRR = Math.pow(1 + computeIRR(irrCashflows), 12) - 1;
  const irrMMCashflows = regularRows.map(r => r.globalReturn + r.mmInterest);
  irrMMCashflows[irrMMCashflows.length - 1] += (balloonRow?.globalReturn ?? 0) + (balloonRow?.mmInterest ?? 0);
  const annualIRRMM = Math.pow(1 + computeIRR(irrMMCashflows), 12) - 1;
  const displayIRR = mmOn ? annualIRRMM : annualIRR;

  const cols = mmOn
    ? ["Month", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Deposit Cum. (3.5%)", "MM Interest", "Global Return w/ MM", "Running IRR"]
    : ["Month", "Investment", "Deal Fee", "Interest", "Total Return", "Prin Returned", "Global Return", "MM Deposit Cum. (3.5%)", "MM Interest", "Global Return w/ MM", "Running IRR"];
  const colWidths = "50px 120px 95px 95px 115px 120px 125px 140px 105px 150px 95px";

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
            <div key={String(r.month)} style={{
              display: "grid", gridTemplateColumns: colWidths,
              padding: "8px 14px", alignItems: "center",
              borderBottom: "1px solid rgba(0,0,0,0.04)",
              background: r.isBalloon ? "rgba(251,191,36,0.05)" : idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
              minWidth: "fit-content",
            }}>
              <span style={{ ...cellStyle, fontWeight: r.isBalloon ? 800 : 500, color: r.isBalloon ? "#b45309" : "#0f172a" }}>{r.month}</span>
              <span style={{ ...cellStyle, color: r.investment < 0 ? "#f87171" : "#0f172a" }}>
                {r.investment !== 0 ? fmt(r.investment) : (r.isBalloon ? "" : "—")}
              </span>
              <span style={cellStyle}>{r.dealFee > 0 ? fmt(r.dealFee) : (r.isBalloon ? "" : "—")}</span>
              <span style={cellStyle}>{r.interest > 0 ? fmt(r.interest) : (r.isBalloon ? "" : "—")}</span>
              {/* Total Return — bold, light green bg */}
              <span style={{
                ...cellStyle, fontWeight: 800,
                color: r.totalReturn > 0 ? "#15803d" : "#0f172a",
                background: r.totalReturn > 0 ? "rgba(22,163,74,0.08)" : "transparent",
                padding: "2px 4px", borderRadius: 3,
              }}>
                {r.totalReturn > 0 ? fmt(r.totalReturn) : (r.isBalloon ? "" : "—")}
              </span>
              <span style={cellStyle}>{r.prinReturned > 0 ? fmt(r.prinReturned) : (r.isBalloon ? "" : "—")}</span>
              <span style={{ ...cellStyle, fontWeight: 700, color: r.globalReturn < 0 ? "#f87171" : r.globalReturn > 0 ? "#16a34a" : "#0f172a" }}>
                {fmt(r.globalReturn)}
              </span>
              {/* MM Deposit */}
              <span style={{ ...cellStyle, color: mmOn ? "#0f172a" : "#cbd5e1" }}>
                {r.mmDeposit > 0 ? fmt(r.mmDeposit) : (r.isBalloon ? "" : "—")}
              </span>
              {/* MM Interest */}
              <span style={{ ...cellStyle, color: mmOn ? "#16a34a" : "#cbd5e1", fontWeight: mmOn ? 600 : 400 }}>
                {r.mmInterest > 0 ? fmt(r.mmInterest) : "—"}
              </span>
              {/* Global Return w/ MM */}
              <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? (r.globalReturnMM < 0 ? "#f87171" : r.globalReturnMM > 0 ? "#16a34a" : "#0f172a") : "#cbd5e1" }}>
                {mmOn ? (r.globalReturnMM !== 0 ? fmt(r.globalReturnMM) : "") : "—"}
              </span>
              {/* Running IRR */}
              <span style={{ ...cellStyle, fontWeight: 700, color: r.month === 0 || r.isBalloon ? "#0f172a" : "#0ea5e9" }}>
                {r.month === 0 || r.isBalloon ? "—" : `${((mmOn ? r.runningIRRMM : r.runningIRR) * 100).toFixed(2)}%`}
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
            <span style={{ ...cellStyle, fontWeight: 700, color: mmOn ? "#0f172a" : "#cbd5e1" }}>{mmOn ? fmt(mmCumTotal) : "—"}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? "#16a34a" : "#cbd5e1" }}>{mmOn ? fmt((balloonRow?.mmInterest ?? 0) + totals.mmInterest) : "—"}</span>
            <span style={{ ...cellStyle, fontWeight: 800, color: mmOn ? "#16a34a" : "#cbd5e1" }}>{mmOn ? fmt(schedule[schedule.length - 1].mmBalance) : "—"}</span>
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
        {/* Export Footer */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(0,0,0,0.01)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>
            Export Table Logic
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => exportTablePDF(schedule, mmOn, displayIRR)}
              style={{
                padding: "4px 14px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                background: "rgba(15,23,42,0.05)",
                border: "1px solid rgba(15,23,42,0.12)",
                color: "#0f172a", transition: "all .15s",
              }}
            >
              Export PDF ↗
            </button>
            <button
              onClick={() => exportTableExcel(schedule, mmOn, displayIRR)}
              style={{
                padding: "4px 14px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                background: "rgba(22,163,74,0.06)",
                border: "1px solid rgba(22,163,74,0.2)",
                color: "#15803d", transition: "all .15s",
              }}
            >
              Export Excel ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function DataRoom() {
  const [open, setOpen] = useState(false);
  const checkmark = <span style={{ color: "#16a34a", fontSize: 13, marginRight: 6 }}>✓</span>;
  const pending = <span style={{ color: "#cbd5e1", fontSize: 11, marginRight: 6 }}>○</span>;
  const exportBtn = (path: string) => (
    <button
      onClick={() => window.open(path, "_blank")}
      style={{
        padding: "2px 10px", borderRadius: 5, fontSize: 9, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.12)",
        color: "#0f172a", transition: "all .15s", whiteSpace: "nowrap",
      }}
    >
      Export ↗
    </button>
  );
  const sectionLabel = (label: string) => (
    <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginTop: 16, marginBottom: 6 }}>
      {label}
    </div>
  );
  const docRow = (name: string, received: boolean, exportPath?: string, unavailable?: boolean) => (
    <div key={name} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 12px", borderRadius: 7,
      background: "rgba(0,0,0,0.015)", border: "1px solid rgba(0,0,0,0.05)",
      marginBottom: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {received ? checkmark : pending}
        <span style={{ fontSize: 11, fontWeight: 600, color: unavailable ? "#94a3b8" : "#0f172a" }}>{name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {unavailable && <span style={{ fontSize: 10, fontStyle: "italic", color: "#94a3b8" }}>Unavailable</span>}
        {received && exportPath && exportBtn(exportPath)}
      </div>
    </div>
  );
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 16px",
        background: open ? "rgba(56,189,248,0.06)" : "rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: open ? "8px 8px 0 0" : 8,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#38bdf8" }}>
          Data Room
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          padding: "12px 16px 16px",
          border: "1px solid rgba(0,0,0,0.07)", borderTop: "none",
          borderRadius: "0 0 8px 8px",
          background: "#fafafa",
        }}>
          {/* Investment Docs */}
          {sectionLabel("Investment Documents")}
          {docRow("Investment Memo", true, "/docs/hteao-investment-memo.pdf")}
          {docRow("Investment Summary", false, undefined, true)}
          {/* Corporate Financials */}
          {sectionLabel("Corporate Financials")}
          {docRow("LTM Set", true, "/docs/hteao-ltm.pdf")}
          {docRow("NTM Set", true, "/docs/hteao-ntm.pdf")}
          {/* Legal */}
          {sectionLabel("Legal")}
          {docRow("Promissory Note", false)}
          {docRow("Security Agreement", false)}
          {docRow("UCC-1 Filing", false)}
          {docRow("Personal Guarantees", false)}
          {docRow("Closing / Disbursement Instructions", false)}
          {docRow("Title / Lien Search", false)}
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
      {/* Card Header — always visible */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>HTeaO Loan</span>

        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>$1,010,000</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>·</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>10% · 12mo</span>

        </div>
      </div>
      {/* Card Body */}
      <div style={{ padding: "16px 20px" }}>
        {/* Data Room */}
        <DataRoom />
        {/* Deal Terms */}
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => setDealOpen(!dealOpen)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 16px",
            background: dealOpen ? "rgba(251,191,36,0.07)" : "rgba(0,0,0,0.02)",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: dealOpen ? "8px 8px 0 0" : 8,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#b45309" }}>
              Deal Terms
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{dealOpen ? "▲" : "▼"}</span>
          </button>
          {dealOpen && (
            <div style={{
              padding: "14px 16px",
              border: "1px solid rgba(0,0,0,0.07)", borderTop: "none",
              borderRadius: "0 0 8px 8px", background: "#fafafa",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  ["Investment", "$1,010,000"],
                  ["Structure", "12 Month Balloon"],
                  ["Rate / Fee", "10% Rate · 1% Fee"],
                  ["Extension", "1% Fee if extended"],
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
      </div>
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
