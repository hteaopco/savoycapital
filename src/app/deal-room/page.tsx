import type { Metadata } from "next";
import { C } from "@/components/palette";
import { PortalShell } from "@/components/PortalShell";

/**
 * Deal Room — the one screen under the nav's Admin section (owner, 2026-08-24).
 *
 * A placeholder shell, deliberately: the owner's instruction was to build the
 * nav first and then "we'll build the Deal Room screen". So this is the route
 * and the frame, with nothing invented about what the screen contains — no
 * columns, no stages, no counts. Guessing that shape now would mean the real
 * build starts by undoing it.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there. It matters more here than on the other
 * screens: a deal room is where unannounced transactions would live.
 */
export const metadata: Metadata = {
  title: "Deal Room — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function DealRoom() {
  return (
    <PortalShell title="Deal Room">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Deal Room</div>

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
