import Link from "next/link";
import { ShieldAlert, ShieldX } from "lucide-react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { C } from "@/components/palette";
import { ALLOWLIST_ENV_VAR, checkAccess } from "@/lib/auth";

/**
 * Every route in the `(private)` group renders through here, so the
 * authorization check happens once and cannot be forgotten on a new page.
 * Middleware has already established that the visitor is signed in; this
 * decides whether the signed-in person is one of the two who may look.
 */
export default async function PrivateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await checkAccess();

  if (!access.allowed) {
    return <AccessRefused reason={access.reason} email={access.email} />;
  }

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

/**
 * The two ways in can fail, told apart on screen. `unconfigured` is an
 * operator's problem and names the variable to set; `not-allowlisted` is a
 * person's problem and says so without leaking who IS on the list.
 */
function AccessRefused({
  reason,
  email,
}: {
  reason: "unconfigured" | "not-allowlisted";
  email: string | null;
}) {
  const unconfigured = reason === "unconfigured";
  const Icon = unconfigured ? ShieldAlert : ShieldX;

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

      <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-5 px-5 py-20 md:px-10 md:py-28">
        <div
          className="flex items-start"
          style={{
            gap: 10,
            padding: "12px 14px",
            borderRadius: 10,
            background: unconfigured ? C.amberBg : C.redBg,
            border: `1px solid ${unconfigured ? C.amberBorder : C.redBorder}`,
            color: unconfigured ? C.amber : C.red,
            fontSize: 13,
            maxWidth: 640,
          }}
        >
          <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="flex flex-col" style={{ gap: 4 }}>
            <div style={{ fontWeight: 700 }}>
              {unconfigured
                ? "The portfolio monitor is not configured yet."
                : "This account cannot open the portfolio monitor."}
            </div>
            <div>
              {unconfigured ? (
                <>
                  No access list is set, so no one can be on it. Set{" "}
                  <code style={{ fontWeight: 700 }}>{ALLOWLIST_ENV_VAR}</code>{" "}
                  on the deployment to the addresses that may sign in.
                </>
              ) : (
                <>
                  You are signed in
                  {email ? (
                    <>
                      {" "}
                      as <span style={{ fontWeight: 700 }}>{email}</span>
                    </>
                  ) : null}
                  , which is not an authorized address. If that is wrong,
                  contact Savoy Capital.
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <SignOutButton>
            <button
              className="inline-flex items-center"
              style={{
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Sign out
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="inline-flex items-center"
            style={{
              gap: 6,
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
            Back to the site
          </Link>
        </div>
      </div>
    </main>
  );
}
