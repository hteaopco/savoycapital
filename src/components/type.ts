import type { CSSProperties } from "react";

/**
 * The PUBLIC surface's display type scale.
 *
 * `design/` covers an internal application — dense tables, modals, pills, forms.
 * `design/README.md` § "The gap this folder does not cover" says so explicitly:
 * a marketing surface needs a display scale that no exemplar demonstrates, and
 * those sizes have to be **authored** rather than copied. This module is that
 * authorship, in one place.
 *
 * It exists because the same `clamp(30px, 4.2vw, 40px)` was written out twice —
 * in `RecentInvestments.tsx` and `coming-soon/page.tsx` — which is a scale that
 * lives nowhere and drifts the first time someone edits one of them.
 *
 * These sizes are NOT on `DESIGN_SYSTEM.md` § 2's type scale, which stops at a
 * 24px page title. That is the point: § 2 is the scale for the portal, and the
 * portal still uses it (an 18/800 screen title, 13 body, 10 field labels). A
 * fund's landing page needs a headline the portal has no vocabulary for.
 *
 * Everything else still binds — color from `C`, weight and letter-spacing stated
 * here rather than in a Tailwind class, `tabular-nums` on any number.
 *
 * **Adding a size here is a design decision, not a convenience.** Three is the
 * whole scale. If a screen wants a fourth, that is a conversation with the owner
 * about the marketing surface, not a fourth constant.
 */

/** Page headline — the one per screen. `<h1>`. */
export const display: CSSProperties = {
  margin: 0,
  fontSize: "clamp(30px, 4.2vw, 40px)",
  fontWeight: 800,
  letterSpacing: "-0.025em",
  lineHeight: 1.1,
};

/** Card or section headline sitting under a `display`. `<h2>`. */
export const displaySm: CSSProperties = {
  margin: 0,
  fontSize: "clamp(22px, 2.6vw, 28px)",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
};

/**
 * The eyebrow above a display headline. This one IS canon —
 * `DESIGN_SYSTEM.md` § 2 type scale: "Eyebrow 10px, weight 700, uppercase,
 * letter-spacing .1em, color accent." Kept here so the three read as one set at
 * the call site; the color stays at the call site because it comes from `C`.
 */
export const eyebrow: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".1em",
};

/**
 * Marketing body copy. Larger and looser than the portal's 12–13px, because a
 * write-up someone reads once is not a table cell they scan.
 */
export const bodyLead: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.7,
};
