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
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there.
 *
 * `noindex` stays. It is no longer load-bearing now that a crawler cannot reach
 * the page at all, but a private surface has no business in an index either way.
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
