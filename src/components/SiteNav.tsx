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
};

export function SiteNav({ action }: SiteNavProps) {
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
        {action ? (
          <Link
            href={action.href}
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
      </div>
    </div>
  );
}
