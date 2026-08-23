import { CreditCard, TrendingUp } from "lucide-react";
import { C } from "@/components/palette";
import { RecentInvestments } from "@/components/RecentInvestments";

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: C.accent,
};

const specLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.textDim,
};

const specValue: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
  fontVariantNumeric: "tabular-nums",
};

/**
 * Every value below that reads as [BRACKETED] is a real fact nobody has supplied
 * yet — check sizes, hold periods, sectors, address, year. They are deliberately
 * visible rather than invented.
 *
 * Note also what is NOT here: performance figures, returns, AUM, and any claim
 * that the fund is open to new capital. A public page marketing a private fund
 * runs into general-solicitation limits, and the footer disclosure is a
 * placeholder pending counsel. See .claudet/FACTS.md.
 */
function InstrumentCard({
  icon,
  title,
  body,
  specs,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  specs: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className="flex flex-col gap-5"
      style={{
        padding: 32,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.bg,
      }}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: C.text,
          }}
        >
          {title}
        </h3>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.65,
          color: C.textMuted,
        }}
      >
        {body}
      </p>

      <div
        className="flex flex-col gap-3"
        style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}
      >
        {specs.map((spec) => (
          <div key={spec.label} className="flex justify-between gap-4">
            <span style={specLabel}>{spec.label}</span>
            <span style={specValue}>{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            href="#"
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

      {/* ── What we invest in ───────────────────────────────────────────── */}
      <div style={{ background: C.bg }}>
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-10 md:pb-20 md:pt-24">
          <div className="mb-10 flex flex-col gap-3">
            <div style={eyebrow}>What we invest in</div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4.2vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                color: C.text,
                maxWidth: 760,
                textWrap: "pretty",
              }}
            >
              Two instruments, one underwriting standard.
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InstrumentCard
              icon={<TrendingUp size={20} color={C.accent} />}
              title="Private Equity"
              body="Control and minority positions in [SECTORS] businesses with durable cash flow. We underwrite to the business as it will actually be run, not to an exit window chosen in advance."
              specs={[
                { label: "Typical equity check", value: "[$X – $Y]" },
                { label: "Positions", value: "Control, minority" },
                { label: "Typical hold", value: "[X years]" },
              ]}
            />
            <InstrumentCard
              icon={<CreditCard size={20} color={C.accent} />}
              title="Private Debt"
              body="Senior and subordinated credit structured directly with the borrower. Terms are negotiated to the situation in front of us rather than fitted to a standard sheet."
              specs={[
                { label: "Typical facility", value: "[$X – $Y]" },
                { label: "Structures", value: "[Senior, unitranche, sub]" },
                { label: "Typical term", value: "[X years]" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Recent investments ──────────────────────────────────────────── */}
      <RecentInvestments />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 pb-12 pt-10 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
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
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textDim }}>
              [STREET ADDRESS · CITY, STATE ZIP]
            </div>
          </div>

          <div style={{ height: 1, background: C.border }} />

          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.7,
              color: C.textDim,
              maxWidth: 860,
            }}
          >
            This website is for informational purposes only and does not
            constitute an offer to sell or a solicitation of an offer to buy any
            security. [DISCLOSURE LANGUAGE TO BE CONFIRMED BY COUNSEL.]
          </p>

          <div style={{ fontSize: 12, fontWeight: 500, color: C.textDim }}>
            © [YEAR] Savoy Capital. All rights reserved.
          </div>
        </div>
      </div>
    </main>
  );
}
