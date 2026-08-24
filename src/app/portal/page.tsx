import type { Metadata } from "next";
import { C } from "@/components/palette";
import { PortalShell } from "@/components/PortalShell";

/**
 * The portal's landing page. Deliberately an empty shell (owner, 2026-08-24):
 * it exists so the nav has somewhere to land, and what it opens on has not been
 * decided. Filling it with invented tiles would be guessing at the product.
 *
 * Not authenticated — see the note on the portfolio page. `noindex` for the
 * same reason, and it comes off when auth goes on.
 */
export const metadata: Metadata = {
  title: "Home — Savoy Capital",
  robots: { index: false, follow: false },
};

export default function PortalHome() {
  return (
    <PortalShell title="Home">
      <div className="px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Home</div>

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
            Nothing here yet — what the portal opens on hasn&rsquo;t been decided.
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
