"use client";
import { useState } from "react";
export default function Presentations() {
  const [menuOpen, setMenuOpen] = useState(false);
  const presentations = [
    {
      date: "02/13/26",
      description: "Preliminary Conceptual Idea",
      file: "/docs/savoy-conceptual-presentation-feb2026.pdf",
    },
  ];

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0 20px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}
          aria-label="Toggle menu">
          <span style={{ display: "block", width: 20, height: 2, background: "#0f172a", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "#0f172a", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "#0f172a", borderRadius: 2 }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a" }}>
          Savoy Capital Fund
        </span>
        <div style={{ width: 28 }} />
      </header>
      {menuOpen && (
        <div style={{
          position: "fixed", top: 52, left: 0, bottom: 0, zIndex: 40, width: 240,
          background: "#ffffff", borderRight: "1px solid rgba(0,0,0,0.07)",
          padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 2,
          boxShadow: "4px 0 16px rgba(0,0,0,0.06)",
        }}>
          <a href="/" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>Dashboard</a>
          <a href="/presentations" onClick={() => setMenuOpen(false)} style={{ ...mobileNavLinkStyle, color: "#0f172a", fontWeight: 800 }}>Presentations</a>
        </div>
      )}

      <main style={{ paddingTop: 52 }}>
        <section style={{ padding: "48px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, letterSpacing: "-.02em", color: "#0f172a", marginBottom: 8, lineHeight: 1.1 }}>
            Presentations
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 32 }}>
            Fund documents and presentations for review.
          </p>
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, width: 120 }}>File</th>
                </tr>
              </thead>
              <tbody>
                {presentations.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <td style={tdStyle}>{p.date}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>{p.description}</td>
                    <td style={tdStyle}>
                      <a href={p.file} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-block", padding: "4px 14px", borderRadius: 6,
                        fontSize: 10, fontWeight: 700,
                        background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.12)",
                        color: "#0f172a", textDecoration: "none",
                      }}>
                        Export ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

const mobileNavLinkStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#0f172a", textDecoration: "none",
  padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)",
};
const navLinkStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: "#64748b", textDecoration: "none",
};
const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontSize: 9, fontWeight: 800,
  textTransform: "uppercase", letterSpacing: ".08em", color: "#94a3b8",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 12, color: "#334155", fontVariantNumeric: "tabular-nums",
};
