"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import { History, Home, LogOut, Menu, PieChart, UserRound, X } from "lucide-react";
import { C } from "./palette";

/**
 * The Investor Portal's shell — theAPlink's left sidebar, carried over for the
 * private surface (owner, 2026-08-24). The public site keeps `SiteNav`; a
 * marketing page and a portal are different surfaces and should not share a bar.
 *
 * `design/MOBILE_REFERENCE.md` § 2 is the spec: a desktop sidebar behind
 * `hidden md:flex`, and on mobile a sticky top bar plus a slide-in drawer whose
 * nav body is the SAME array the sidebar renders, so the two cannot drift.
 *
 * **What is deliberately not built: the bottom tab bar.** § 2 describes one for
 * "the feature-gated daily drivers", and then says the drawer is the complete
 * nav and anything else living there is fine. With three destinations a tab bar
 * would duplicate the whole menu rather than shortcut part of it. Add one when
 * there are enough screens for the shortcut to mean something.
 *
 * There is no entity switcher under the title. theAPlink has one because it
 * serves many companies; `FACTS.md` is explicit that Savoy is one fund, and a
 * chevron there would advertise a structure the product does not have.
 *
 * **The account block is ours, not Clerk's `UserButton`** (owner, 2026-08-24:
 * "i do not like the clerk icon and i prefer it at the bottom"). It sits at the
 * foot of the nav, in theAPlink's arrangement: identity on the left, Sign Out
 * and Account stacked on the right. Clerk still does the work — `SignOutButton`
 * ends the session and `openUserProfile()` opens the account modal — but the
 * chrome is the design system's, so the one piece of the portal we did not draw
 * no longer stands out as the one piece we did not draw.
 *
 * The shell renders it rather than taking it as a slot: every page behind here
 * is authenticated, and a slot would mean each new portal page has to remember
 * to pass it, with a user who cannot sign out as the cost of forgetting.
 */

const SIDEBAR_W = 240;

/** UI feedback — design/DESIGN_SYSTEM.md § 0.8 caps this at 200ms. */
const TRANSITION = "160ms ease";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
};

const NAV: NavItem[] = [
  { href: "/portal", label: "Home", Icon: Home },
  { href: "/portal/portfolio", label: "Portfolio", Icon: PieChart },
  { href: "/portal/historical", label: "Historical", Icon: History },
];

const wordmark: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  color: C.text,
};

/** Initials for the avatar chip. Falls back down to the email, then to nothing. */
function initialsOf(name: string | null | undefined, email: string | undefined): string {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

const accountButton: React.CSSProperties = {
  gap: 6,
  padding: "5px 9px",
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

function AccountBlock() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName ?? email ?? "";
  const initials = initialsOf(user?.fullName, email);

  return (
    <div
      className="flex items-center"
      style={{ gap: 10, marginTop: "auto", padding: 12, borderTop: `1px solid ${C.border}` }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: "50%",
          background: C.accentBg,
          border: `1px solid ${C.accentBorder}`,
          color: C.accent,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {initials}
      </span>

      {/* Truncates: § 0.7 lets a name go to an ellipsis, and an email is a name
          here, not a value someone has to read in full. */}
      <div className="min-w-0 flex-1">
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 4, flexShrink: 0 }}>
        <SignOutButton>
          <button className="inline-flex items-center min-h-[44px] md:min-h-0" style={accountButton}>
            <LogOut size={13} />
            Sign Out
          </button>
        </SignOutButton>
        <button
          onClick={() => openUserProfile()}
          className="inline-flex items-center min-h-[44px] md:min-h-0"
          style={accountButton}
        >
          <UserRound size={13} />
          Account
        </button>
      </div>
    </div>
  );
}

function NavBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col" style={{ gap: 2, padding: "8px 8px" }}>
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="flex items-center min-h-[44px] md:min-h-0"
            style={{
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              // The active row is filled and carries an accent edge, which is
              // how theAPlink marks it. Copied rather than reinterpreted.
              borderLeft: `2px solid ${active ? C.accent : "transparent"}`,
              background: active ? C.accentBg : "transparent",
              color: active ? C.accent : C.textMuted,
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              textDecoration: "none",
              transition: `background ${TRANSITION}, color ${TRANSITION}`,
            }}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export type PortalShellProps = {
  /** Screen name, shown in the mobile top bar where there is no sidebar. */
  title: string;
  children: React.ReactNode;
};

export function PortalShell({ title, children }: PortalShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /**
   * `DESIGN_SYSTEM.md` § 7: "every modal closes on Esc." The drawer is a modal —
   * it covers the page with `C.overlay` and takes the tap — so it owes the same
   * behaviour, and a scrim you can only dismiss by tapping it is unusable to
   * anyone driving this from a keyboard.
   *
   * Focus goes back to the menu button on close. Without that, dismissing the
   * drawer drops focus to `<body>` and the next Tab restarts from the top of the
   * document — the control you just used is suddenly nowhere.
   *
   * NOT a focus trap. That needs a sentinel pair and a scroll lock, it belongs
   * with the mobile seat's drawer work rather than bolted on here, and Esc plus
   * focus return is the part § 7 actually names. Called out so the gap is a known
   * one rather than an oversight.
   */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex" style={{ minHeight: "100vh", background: C.bg }}>
      <aside
        className="hidden md:flex md:flex-col"
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: C.bg,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={wordmark}>Investor Portal</div>
        </div>
        <NavBody pathname={pathname} />
        <AccountBlock />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex items-center md:hidden"
          style={{
            gap: 12,
            padding: "10px 12px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bg,
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            ref={menuButtonRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="inline-flex items-center justify-center min-h-[44px]"
            style={{
              width: 44,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.text,
            }}
          >
            <Menu size={18} />
          </button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.text }}>{title}</div>
        </div>

        {drawerOpen ? (
          <div
            className="md:hidden"
            style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 70 }}
            onClick={closeDrawer}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: SIDEBAR_W,
                height: "100%",
                background: C.bg,
                boxShadow: C.shadowDrawer,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{ gap: 12, padding: "12px 12px 12px 18px", borderBottom: `1px solid ${C.border}` }}
              >
                <div style={wordmark}>Investor Portal</div>
                <button
                  onClick={() => {
                    closeDrawer();
                    menuButtonRef.current?.focus();
                  }}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center min-h-[44px]"
                  style={{ width: 44, border: "none", background: "transparent", color: C.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>
              {/* Same NAV array as the sidebar — § 2's "one source of truth". */}
              <NavBody pathname={pathname} onNavigate={closeDrawer} />
              <AccountBlock />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
