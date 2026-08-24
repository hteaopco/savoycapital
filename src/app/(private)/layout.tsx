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
    return (
      <AccessRefused
        reason={access.reason}
        phone={access.phone}
        hint={access.hint}
      />
    );
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
 * The three ways in can fail, told apart on screen. Two are an operator's
 * problem and name what to fix; only `not-allowlisted` is a person's problem,
 * and it says so without leaking who IS on the list.
 */
function AccessRefused({
  reason,
  phone,
  hint,
}: {
  reason: "unconfigured" | "no-verified-phone" | "not-allowlisted";
  phone: string | null;
  hint?: string;
}) {
  // Only an unauthorized PERSON is an error; the other two are misconfiguration
  // and read as caution rather than rejection.
  const misconfigured = reason !== "not-allowlisted";
  const Icon = misconfigured ? ShieldAlert : ShieldX;

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
            background: misconfigured ? C.amberBg : C.redBg,
            border: `1px solid ${misconfigured ? C.amberBorder : C.redBorder}`,
            color: misconfigured ? C.amber : C.red,
            fontSize: 13,
            maxWidth: 640,
          }}
        >
          <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div className="flex flex-col" style={{ gap: 4 }}>
            <div style={{ fontWeight: 700 }}>
              {reason === "unconfigured"
                ? "The portfolio monitor is not configured yet."
                : reason === "no-verified-phone"
                  ? "This account has no verified phone number."
                  : "This account cannot open the portfolio monitor."}
            </div>
            <div>
              {reason === "unconfigured" ? (
                <>
                  No access list is set, so no one can be on it. Set{" "}
                  <code style={{ fontWeight: 700 }}>{ALLOWLIST_ENV_VAR}</code>{" "}
                  on the deployment to the numbers that may sign in, in
                  international format.
                </>
              ) : reason === "no-verified-phone" ? (
                <>
                  Access is granted by phone number, and this account carries
                  none that is verified. That is usually a configuration
                  problem rather than a permissions one — check that the Clerk
                  instance collects and verifies phone numbers.
                </>
              ) : (
                <>
                  You are signed in
                  {phone ? (
                    <>
                      {" "}
                      as <span style={{ fontWeight: 700 }}>{phone}</span>
                    </>
                  ) : null}
                  , which is not an authorized number. If that is wrong,
                  contact Savoy Capital.
                </>
              )}
            </div>
            {hint ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>{hint}</div>
            ) : null}
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
