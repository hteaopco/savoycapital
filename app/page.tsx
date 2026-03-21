"use client";
import { useState } from "react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Nav Bar */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        padding: "0 20px",
        height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: ".06em",
          textTransform: "uppercase", color: "#0f172a",
        }}>
          Savoy Capital Fund
        </span>

        {/* Desktop nav links */}
        <nav style={{ display: "flex", gap: 24 }} className="desktop-nav">
          <a href="#portfolio" style={navLinkStyle}>Portfolio</a>
          <a href="#debt" style={navLinkStyle}>Debt</a>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger"
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 5,
            padding: 4,
          }}
          aria-label="Toggle menu"
        >
          <span style={barStyle(menuOpen, "top")} />
          <span style={barStyle(menuOpen, "mid")} />
          <span style={barStyle(menuOpen, "bot")} />
        </button>
      </header>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 52, left: 0, right: 0, zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "12px 20px 16px",
          display: "flex", flexDirection: "column", gap: 2,
        }}
        className="mobile-menu"
        >
          <a href="#portfolio" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>Portfolio</a>
          <a href="#debt" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>Debt</a>
        </div>
      )}

      {/* Main Content */}
      <main style={{ paddingTop: 52 }}>
        {/* Hero */}
        <section style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          minHeight: "calc(100vh - 52px)",
          padding: "60px 24px",
          maxWidth: 680, margin: "0 auto",
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".12em", color: "#38bdf8", marginBottom: 12,
          }}>
            Venture Capital
          </p>
          <h1 style={{
            fontSize: "clamp(32px, 8vw, 52px)",
            fontWeight: 800, letterSpacing: "-.02em",
            color: "#0f172a", marginBottom: 16, lineHeight: 1.1,
          }}>
            Savoy Capital Fund
          </h1>
          <p style={{
            fontSize: "clamp(15px, 3vw, 18px)",
            color: "#64748b", marginBottom: 40, maxWidth: 420,
            lineHeight: 1.6,
          }}>
            Backing Exceptional SaaS Founders
          </p>
          <div>
            <a href="#portfolio" style={{
              display: "inline-block",
              padding: "10px 24px", borderRadius: 8,
              fontSize: 12, fontWeight: 800,
              background: "rgba(56,189,248,0.10)",
              border: "1px solid rgba(56,189,248,0.35)",
              color: "#38bdf8", textDecoration: "none",
              transition: "all .15s", fontFamily: "inherit",
            }}>
              Learn More →
            </a>
          </div>
        </section>

        {/* Divider */}
        <div style={{ margin: "0 24px", borderTop: "1px solid rgba(0,0,0,0.06)" }} />

        {/* Portfolio Section */}
        <section id="portfolio" style={{ padding: "72px 24px", maxWidth: 900, margin: "0 auto" }}>
          <p style={eyebrowStyle}>Investments</p>
          <h2 style={sectionTitleStyle}>Our Portfolio</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: "rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: 12,
                minHeight: 180,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                  textTransform: "uppercase", color: "#cbd5e1",
                }}>
                  Portfolio Company
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ margin: "0 24px", borderTop: "1px solid rgba(0,0,0,0.06)" }} />

        {/* Debt Section */}
        <section id="debt" style={{ padding: "72px 24px", maxWidth: 900, margin: "0 auto" }}>
          <p style={eyebrowStyle}>Credit</p>
          <h2 style={sectionTitleStyle}>Debt</h2>
          <div style={{
            background: "rgba(0,0,0,0.02)",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Coming soon.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

// Shared styles
const navLinkStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: "#64748b",
  textDecoration: "none",
};

const mobileNavLinkStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#0f172a",
  textDecoration: "none", padding: "10px 0",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".12em", color: "#38bdf8", marginBottom: 8,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 26, fontWeight: 800, color: "#0f172a",
  marginBottom: 32, letterSpacing: "-.01em",
};

function barStyle(open: boolean, pos: "top" | "mid" | "bot"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "block", width: 20, height: 2,
    background: "#0f172a", borderRadius: 2,
    transition: "all .2s",
  };
  if (open && pos === "top") return { ...base, transform: "translateY(7px) rotate(45deg)" };
  if (open && pos === "mid") return { ...base, opacity: 0 };
  if (open && pos === "bot") return { ...base, transform: "translateY(-7px) rotate(-45deg)" };
  return base;
}
