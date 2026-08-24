import type { Metadata } from "next";
import { C } from "@/components/palette";
import { PortalShell } from "@/components/PortalShell";

/**
 * Home — the portal's landing screen. A coming-soon placeholder for now
 * (owner, 2026-08-24: "re route this to /home - and just a coming soon place
 * holder").
 *
 * It sits at `/home` rather than `/portal/home` because that is the path the
 * owner named. `/portal` still redirects to Portfolio and is NOT repointed here:
 * `signInFallbackRedirectUrl` in `src/app/layout.tsx` lands there after sign-in,
 * that prop belongs to the Clerk seat, and dropping someone onto a placeholder
 * the moment they sign in would be worse than landing them on a real screen.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there.
 */
export const metadata: Metadata = {
  title: "Home — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function PortalHomeScreen() {
  return (
    <PortalShell title="Home">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Home</div>

          {/* The dashed empty-state card, radius 10 — DESIGN_SYSTEM.md § 2's
              step for a dashed "empty" card, matching /portal/historical so the
              two unbuilt screens read as the same state rather than two. */}
          <div
            style={{
              maxWidth: 720,
              padding: 24,
              borderRadius: 10,
              border: `1px dashed ${C.borderStrong}`,
              background: C.bgAlt,
              color: C.textMuted,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Coming soon.
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
