import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { C } from "@/components/palette";

export const metadata: Metadata = {
  title: "Investor Login — Savoy Capital",
  description: "The Savoy Capital investor portal is not yet available.",
  // Nothing here is worth indexing, and a "coming soon" page ranking for the
  // firm's name would be worse than no result at all.
  robots: { index: false, follow: false },
};

export default function ComingSoon() {
  return (
    <main>
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
          <Link
            href="/"
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".14em",
              color: C.text,
              textDecoration: "none",
            }}
          >
            SAVOY CAPITAL
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 px-5 py-24 md:px-10 md:py-32">
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            color: C.accent,
          }}
        >
          Investor Login
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(30px, 4.2vw, 40px)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: C.text,
          }}
        >
          Coming soon.
        </h1>

        <Link
          href="/"
          className="inline-flex items-center"
          style={{
            gap: 8,
            marginTop: 8,
            padding: "12px 20px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            color: C.text,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Back to the site
        </Link>
      </div>
    </main>
  );
}
