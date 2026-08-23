// Forced-light palette for the standalone accounting portal — matches the
// Scheduler shell (Jett 2026-07-06). This section opts out of the dark theme
// tokens; lint skips the path (scripts/check-design-tokens.ts).
export const C = {
  bg: "#ffffff",
  bgAlt: "#f8fafc",
  bgRow: "#f1f5f9",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  accent: "#0284c7",
  accentBg: "#e0f2fe",
  accentBorder: "#bae6fd",
  green: "#16a34a",
  greenBg: "#dcfce7",
  greenBorder: "#bbf7d0",
  amber: "#b45309",
  amberBg: "#fef3c7",
  amberBorder: "#fde68a",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  overlay: "rgba(15, 23, 42, 0.45)",
  // Foreground on a SOLID tone surface (accent / green / amber / red button, solid pill).
  // The one white the design allows — it was living in components as `#ffffff` and `#fff`,
  // two spellings of the same decision.
  onSolid: "#ffffff",
  // Scrim for a full-bleed document viewer, where the page behind should read as
  // dismissed rather than merely dimmed.
  overlayStrong: "rgba(15, 23, 42, 0.7)",

  // Elevation. One base (the `text` slate at low alpha) and three steps — the geometry
  // was already consistent across the app; these names are what keep it that way.
  //   sm  popovers, dropdowns, floating cards
  //   md  raised panels
  //   lg  modals and sheets
  shadowSm: "0 8px 24px rgba(15, 23, 42, 0.12)",
  shadowMd: "0 10px 30px rgba(15, 23, 42, 0.15)",
  shadowLg: "0 20px 60px rgba(15, 23, 42, 0.25)",
  // The mobile slide-in drawer reads as an edge glow, not an elevation — no offset.
  shadowDrawer: "0 0 40px rgba(15, 23, 42, 0.25)",
};
