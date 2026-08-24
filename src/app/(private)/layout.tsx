import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { C } from "@/components/palette";

/**
 * The shell for every route in the `(private)` group.
 *
 * There is deliberately **no authorization check here**. The boundary is that
 * the Clerk instance is set to restricted sign-up, so an account cannot exist
 * unless one of the principals invited it — "signed in" and "allowed in" are
 * the same statement on this instance. `src/proxy.ts` enforces the first, and
 * therefore both.
 *
 * The cost of that, stated where someone will see it: **if sign-up is ever set
 * back to public in the Clerk Dashboard, this surface opens silently.** Nothing
 * in this repo can detect that. See `.claudet/PLAYBOOKS/auth-clerk.md` GOTCHA 3
 * for how to check it, and `DECISIONS.md` for why the second lock was dropped.
 */
export default function PrivateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main>
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
          <div className="flex items-center" style={{ gap: 12 }}>
            <Link
              href="/monitor"
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
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                background: C.accentBg,
                border: `1px solid ${C.accentBorder}`,
                color: C.accent,
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Portfolio Monitor
            </span>
          </div>
          <UserButton />
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-10 md:py-14">
        {children}
      </div>
    </main>
  );
}
