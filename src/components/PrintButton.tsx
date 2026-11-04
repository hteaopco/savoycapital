"use client";

import { Printer } from "lucide-react";
import { C } from "./palette";

/**
 * "Print / Save PDF" — the browser's own print dialog (owner, 2026-11-04:
 * "give me a way to print this into PDF").
 *
 * ## Why `window.print()` and not a PDF library
 *
 * Every browser's print dialog has "Save as PDF" as a destination, so this IS
 * the PDF export — no `@react-pdf`, no headless Chromium on the server, no
 * second rendering of the same screen that would drift from the first. The
 * page you see is the page that prints, which is the only version that cannot
 * disagree with itself.
 *
 * It is also the only option that keeps the figures off the wire: the PDF is
 * produced inside the owner's browser and never leaves it. A server-side
 * renderer would mean this fund's size and position-level amounts round-trip
 * through a route and land in a temp file — a new place for them to be, which
 * `CLAUDE.md`'s disclosure framing says to avoid rather than secure.
 *
 * ## A client component for one line
 *
 * `window.print()` needs a browser, and the Portfolio page is a server
 * component (`force-dynamic`, it reads the session). This is the smallest
 * possible island: no state, no effect, one handler.
 *
 * ## It hides itself
 *
 * `sc-no-print` — `globals.css`'s print block drops it along with the portal
 * chrome. A Print button printed onto the PDF is the giveaway that nobody
 * looked at the output.
 */
export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      /*
        `min-h-[44px] md:min-h-0` — `globals.css` floors form controls on touch
        and deliberately NOT `button`, so § 0.8's 36px carve-out survives; a
        button states its own floor at the call site. mobile-lint checks that
        it is stated.
      */
      className="sc-no-print inline-flex items-center min-h-[44px] md:min-h-0"
      style={{
        // AP_DESIGN_REFERENCE.md:127 — secondary / bordered button, verbatim.
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg,
        color: C.text,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      <Printer size={14} />
      {label}
    </button>
  );
}
