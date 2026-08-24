"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import {
  ExternalLink,
  Globe,
  Handshake,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Shield,
  UserRound,
  X,
} from "lucide-react";
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
 * nav and anything else living there is fine. With four destinations across two
 * groups — one of which leaves the portal — a tab bar would duplicate the whole
 * menu rather than shortcut part of it — and it has no way to express the grouping. Add one when there are enough
 * screens for the shortcut to mean something.
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
  Icon: typeof PieChart;
  /**
   * Leaves the portal. Rendered as a plain `<a target="_blank">` rather than a
   * `next/link`, and marked with a trailing glyph so the jump is visible before
   * the click rather than after it.
   */
  external?: boolean;
};

type NavSection = {
  title: string;
  Icon: typeof PieChart;
  /** Hidden from investors. Not a control — see `PortalShellProps.isManagement`. */
  managementOnly?: boolean;
  items: NavItem[];
};

/**
 * The nav, grouped (owner, 2026-08-24) — an "Admin" section over a rule, then
 * "Portal Home".
 *
 * The shape is copied from the screenshot the owner supplied of theAPlink's own
 * sidebar: a titled group with a lucide icon, its children indented behind a
 * vertical spine, and the active child filled with `C.accentBg`. **`design/` has
 * no nav-group-label spec to copy instead** — `DESIGN_SYSTEM.md` § 2's "Section
 * header 14px/800/uppercase" is the panel header inside a card (see its § 3.4
 * bottom-sheet entry, which is where that line is sourced from), and
 * `AP_DESIGN_REFERENCE.md` § "Nav" says only that the sidebar is `hidden md:flex`.
 * So this follows the artifact rather than inventing a reading of the canon, and
 * the label sits at the body size the links use rather than at 14/800/uppercase,
 * which beside a 15px wordmark in a 240px rail would out-shout the wordmark.
 *
 * ONE array for both the desktop sidebar and the mobile drawer, as before —
 * `MOBILE_REFERENCE.md` § 2 requires the drawer's nav body to be the same source
 * the sidebar renders, so the two cannot drift.
 */
const NAV: NavSection[] = [
  {
    title: "Admin",
    Icon: Shield,
    managementOnly: true,
    items: [
      { href: "/deal-room", label: "Deal Room", Icon: Handshake },
      { href: "/fund-users", label: "Fund & Users", Icon: IdCard },
    ],
  },
  {
    title: "Portal Home",
    Icon: LayoutDashboard,
    items: [
      // Home and Historical were REMOVED on 2026-08-24 (owner: "lets just delete
      // home and historical links for now...until we have something to put
      // here"). Their pages went with them rather than being left reachable by
      // URL and linked from nowhere — the `/coming-soon` situation this repo
      // already carries as a known wart. `git revert` brings both back whole.
      //
      // `/portal` still redirects to Portfolio, which matters more now, not
      // less: `signInFallbackRedirectUrl` in src/app/layout.tsx lands there
      // after sign-in, and Portfolio is the only portal screen left to land on.
      // The public marketing site (owner, 2026-08-24).
      //
      // `/` rather than the absolute `https://savoycapital.io/` the owner gave.
      // In production they are the same page, and a relative href cannot go
      // stale against a domain change and does not send a preview or a local
      // build off to production to show you the wrong build. Say the word and
      // it becomes the absolute URL — it is one line.
      //
      // It never lights up as active, which is correct: the active test is
      // `pathname === href` and this leaves the portal entirely.
      {
        href: "/",
        label: "Public Page",
        Icon: Globe,
        external: true,
      },
      { href: "/portal/portfolio", label: "Portfolio", Icon: PieChart },
    ],
  },
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

/** Group label — the row that titles a section. Not a link and not focusable. */
const sectionTitle: React.CSSProperties = {
  gap: 8,
  padding: "6px 10px",
  color: C.text,
  fontSize: 13,
  fontWeight: 800,
  fontFamily: "inherit",
  letterSpacing: "-0.01em",
};

function NavBody({
  pathname,
  isManagement,
  onNavigate,
}: {
  pathname: string;
  isManagement: boolean;
  onNavigate?: () => void;
}) {
  // The rule between groups is drawn on the section rather than as a sibling,
  // so dropping a section drops its rule with it and the remaining group does
  // not open with a stray hairline.
  const sections = NAV.filter((s) => isManagement || !s.managementOnly);
  return (
    <nav className="flex flex-col" style={{ padding: "8px 8px" }}>
      {sections.map((section, sectionIndex) => (
        <div key={section.title} className="flex flex-col">
          {/* The rule the owner asked for, between the groups rather than around
              each one — so it reads as one separator, not a boxed list. Drawn on
              the section rather than as a sibling <hr> so it cannot drift out of
              step if a third group is added. */}
          {sectionIndex > 0 ? (
            <div
              aria-hidden
              style={{ borderTop: `1px solid ${C.border}`, margin: "8px 2px" }}
            />
          ) : null}

          <div className="flex items-center" style={sectionTitle}>
            <section.Icon size={16} color={C.textMuted} />
            {section.title}
          </div>

          {/* The children's spine. `AP_DESIGN_REFERENCE.md` has no token for this,
              so it is C.border at 1px — the same hairline every other divider in
              the app uses. The per-item ticks in the owner's screenshot are NOT
              drawn: they need an absolutely-positioned element per row, and the
              spine alone already carries the grouping. */}
          <div
            className="flex flex-col"
            style={{
              gap: 2,
              marginLeft: 17,
              paddingLeft: 9,
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            {section.items.map(({ href, label, Icon, external }) => {
              const active = !external && pathname === href;
              // An external entry is a plain <a> in a new tab. `next/link`
              // would prefetch it into the router cache and swap it in
              // client-side, which is wrong for a link whose whole purpose is
              // to leave the portal — and `rel` is not optional beside
              // target="_blank": without `noopener` the opened page gets a
              // handle on this one through `window.opener`.
              const Tag = external ? "a" : Link;
              const linkProps = external
                ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
                : { href };
              return (
                <Tag
                  key={href}
                  {...linkProps}
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
                  <span style={{ flex: 1 }}>{label}</span>
                  {external ? (
                    <ExternalLink size={12} color={C.textDim} aria-hidden />
                  ) : null}
                </Tag>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export type PortalShellProps = {
  /** Screen name, shown in the mobile top bar where there is no sidebar. */
  title: string;
  /**
   * Hides the Admin section for anyone who is not management.
   *
   * **Hiding a link is not a control**, and nothing here should be read as one:
   * every page and every route behind these links guards itself, because a nav
   * that only hides its own entries leaves the URL open to anyone who types it.
   * This is so an investor is not shown two destinations that would bounce them
   * straight back.
   *
   * Defaults to true so a caller that forgets to pass it shows MORE chrome
   * rather than less — the failure is then visible on screen instead of being a
   * screen somebody quietly cannot find.
   */
  isManagement?: boolean;
  children: React.ReactNode;
};

export function PortalShell({ title, isManagement = true, children }: PortalShellProps) {
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
        <NavBody pathname={pathname} isManagement={isManagement} />
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
              <NavBody pathname={pathname} isManagement={isManagement} onNavigate={closeDrawer} />
              <AccountBlock />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
