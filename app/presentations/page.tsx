export default function Presentations() {
  const presentations = [
    {
      date: "02/13/26",
      description: "Preliminary Conceptual Idea — Savoy Capital Fund",
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
        <nav style={{ display: "flex", gap: 20 }}>
          <a href="/" style={navLinkStyle}>Dashboard</a>
          <a href="/presentations" style={{ ...navLinkStyle, color: "#0f172a" }}>Presentations</a>
        </nav>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#0f172a" }}>
          Savoy Capital Fund
        </span>
        <div style={{ width: 28 }} />
      </header>

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
