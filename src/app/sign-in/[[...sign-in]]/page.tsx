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
            Access is by invitation. If you should have an account and
            don&rsquo;t, contact Savoy Capital directly.
          </div>
        </div>

        {/* Clerk renders its own card here; the palette reaches it through the
            appearance variables set on ClerkProvider in the root layout. */}
        <SignIn />
      </div>
    </main>
  );
}
