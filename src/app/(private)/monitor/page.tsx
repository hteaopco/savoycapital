import type { Metadata } from "next";
import { checkAccess } from "@/lib/auth";
import { C } from "@/components/palette";

export const metadata: Metadata = {
  title: "Portfolio Monitor — Savoy Capital",
  robots: { index: false, follow: false },
};

/**
 * The shell of the private surface, and deliberately nothing more.
 *
 * It exists so the auth boundary has something behind it: middleware that
 * protects no route and an allowlist that gates no page are both untestable
 * claims. What the monitor actually shows waits on a decision that is blocked
 * on a person — what an equity position holds versus a debt position — which
 * `.claudet/STATE.md` records. Guessing that schema here would be inventing
 * the product's core model to fill a page.
 */
export default async function MonitorPage() {
  const access = await checkAccess();

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div
        className="flex items-start justify-between flex-wrap"
        style={{ gap: 12 }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
            Portfolio Monitor
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 640 }}>
            {access.allowed
              ? `Signed in as ${access.greeting}.`
              : "Signed in."}{" "}
            This surface is private to Savoy Capital.
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 24,
          borderRadius: 10,
          border: `1px dashed ${C.borderStrong}`,
          background: C.bgAlt,
          color: C.textMuted,
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Nothing is tracked here yet. The monitor gets built once the position
        model is settled — what an equity position holds versus a debt one, and
        what a valuation event is.
      </div>
    </div>
  );
}
