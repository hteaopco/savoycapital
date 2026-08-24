import Link from "next/link";
import { C } from "./palette";

/**
 * The site's top bar. Extracted from the landing page when the portfolio screen
 * needed the same wordmark: the two surfaces differ only in the action on the
 * right, so they share the bar rather than growing a second copy of it that
 * drifts. design/DESIGN_SYSTEM.md § 0.6 — one canonical state per role.
 *
 * The wordmark is deliberately NOT a link. It was a plain <div> on the landing
 * page and stays one here — making it clickable would be a change to a surface
 * the owner has already signed off, smuggled in under a refactor.
 */
export type SiteNavProps = {
  /** The right-hand link. Omit for a bar with no action. */
  action?: { href: string; label: string };
  /**
   * Rendered to the right of the action. The authenticated surface puts
   * Clerk's `<UserButton />` here — a slot rather than an `auth?: boolean`
   * prop, so this component keeps knowing nothing about authentication.
   */
  trailing?: React.ReactNode;
};

export function SiteNav({ action, trailing }: SiteNavProps) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: ".14em",
            color: C.text,
          }}
        >
          SAVOY CAPITAL
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          {action ? (
            <Link
              href={action.href}
              // 44px on touch, the bar's own density from md up. This is the
              // public site's only action and it sat at ~32px, below even § 7's
              // 36px carve-out — which would not have applied anyway, since that
              // one is for a SECONDARY control and this is the primary. A pointer
              // is not a thumb, so desktop is unchanged.
              className="inline-flex items-center min-h-[44px] md:min-h-0"
              style={{
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
              {action.label}
            </Link>
          ) : null}
          {trailing}
        </div>
      </div>
    </div>
  );
}
