import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { C } from "@/components/palette";
import { display, eyebrow } from "@/components/type";

export const metadata: Metadata = {
  title: "Investor Portal — Savoy Capital",
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
        <div style={{ ...eyebrow, color: C.accent }}>Investor Portal</div>

        <h1 style={{ ...display, color: C.text }}>Coming soon.</h1>

        <Link
          href="/"
          // ~41px as written — just under § 7's floor on touch, unchanged on
          // desktop where a pointer is doing the clicking.
          className="inline-flex items-center min-h-[44px] md:min-h-0"
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
