import { C } from "@/components/palette";
import { RecentInvestments } from "@/components/RecentInvestments";

export default function Home() {
  return (
    <main>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".14em",
              color: C.text,
            }}
          >
            SAVOY CAPITAL
          </div>
          <a
            href="/coming-soon"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Investor login
          </a>
        </div>
      </div>

      {/* ── Portfolio — the whole page, for now ─────────────────────────── */}
      <RecentInvestments />
    </main>
  );
}
