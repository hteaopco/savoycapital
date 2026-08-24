"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { History, Home, Menu, PieChart, X } from "lucide-react";
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
 * **This shell renders Clerk's `UserButton` itself, and that is deliberate.**
 * `SiteNav` takes it as a `trailing` slot so the public bar keeps knowing
 * nothing about authentication — right for a component the marketing page also
 * uses. This one is different: it is the portal's shell, every page behind it
 * is authenticated, and the button is the only way to sign out. A slot here
 * would mean each new portal page has to remember to pass it, and the cost of
 * forgetting is a user who cannot log out.
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
        <div
          className="flex items-center justify-between"
          style={{ gap: 10, padding: "14px 14px 14px 18px", borderBottom: `1px solid ${C.border}` }}
        >
          <div style={wordmark}>Investor Portal</div>
          <UserButton />
        </div>
        <NavBody pathname={pathname} />
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
          <UserButton />
        </div>

        {drawerOpen ? (
          <div
            className="md:hidden"
            style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 70 }}
            onClick={() => setDrawerOpen(false)}
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
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center min-h-[44px]"
                  style={{ width: 44, border: "none", background: "transparent", color: C.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>
              {/* Same NAV array as the sidebar — § 2's "one source of truth". */}
              <NavBody pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
