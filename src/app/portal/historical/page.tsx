import type { Metadata } from "next";
import { C } from "@/components/palette";
import { PortalShell } from "@/components/PortalShell";

/**
 * Historical — the fund's positions over time. Deliberately an empty shell
 * (owner, 2026-08-24).
 *
 * `FACTS.md` is explicit that the monitor is a TIME-SERIES product: positions
 * carry a history of marks and valuation events, not just a current value. What
 * that history is actually made of is the decision `STATE.md` records as blocked
 * on a person, so this page waits for it rather than inventing a shape that the
 * schema would then have to match.
 *
 * Not authenticated — see the note on the portfolio page. `noindex` for the
 * same reason, and it comes off when auth goes on.
 */
export const metadata: Metadata = {
  title: "Historical — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function Historical() {
  return (
    <PortalShell title="Historical">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Historical</div>

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
            Nothing here yet — marks and valuations over time land here once a
            position&rsquo;s history is defined.
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
