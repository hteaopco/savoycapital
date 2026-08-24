import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { C } from "@/components/palette";
import { eyebrow } from "@/components/type";

export const metadata: Metadata = {
  title: "Investor Login — Savoy Capital",
  description: "Sign in to the Savoy Capital portfolio monitor.",
  // Same reasoning as /coming-soon: a login form is not a search result the
  // firm wants ranking for its own name, and there is nothing here to index.
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main>
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
          {/*
            A real link here (SiteNav's wordmark is deliberately a <div> and stays
            one), so it is a control and owes § 7's floor. Measured 137x20 before
            this. 44 on touch, its own density from md up.
          */}
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] md:min-h-0"
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

      <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-8 px-5 py-16 md:px-10 md:py-24">
        <div className="flex flex-col items-center" style={{ gap: 6 }}>
          <div style={{ ...eyebrow, color: C.accent }}>Investor Login</div>
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              maxWidth: 420,
              textAlign: "center",
            }}
          >
            Accounts are created by Savoy Capital. If you should have access
            and don&rsquo;t, contact us directly.
          </div>
        </div>

        {/* Clerk renders its own card here; the palette reaches it through the
            appearance variables set on ClerkProvider in the root layout. */}
        <SignIn />
      </div>
    </main>
  );
}
