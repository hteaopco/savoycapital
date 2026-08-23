"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { C } from "./palette";

const AUTOPLAY_MS = 6000;

/**
 * design/DESIGN_SYSTEM.md § 0.8 caps animation at 200ms, with one carve-out added
 * for this product (owner, 2026-08-23): a CONTENT CROSSFADE may run to 400ms.
 * This is that crossfade. UI feedback still has a hard 200ms ceiling — do not
 * reach for this constant to time a hover or a press.
 */
const FADE_MS = 400;

type Investment = {
  name: string;
  /** Holding status. "Current" today; realized positions would read differently. */
  status: string;
  /** Instrument. */
  kind: string;
  /** Year of investment. */
  year: string;
  blurb: string;
  website: { href: string; label: string };
  image: {
    src: string;
    width: number;
    height: number;
    /**
     * "logo" sits centered inside the slide's padding; "photo" fills the frame
     * edge to edge. The supplied assets are not the same kind of image (see
     * uploads/README.md), so the slide adapts rather than pretending they match.
     */
    treatment: "logo" | "photo";
  };
};

const INVESTMENTS: Investment[] = [
  {
    name: "HTeaO Franchisee",
    status: "Current",
    kind: "Private Credit",
    year: "2026",
    blurb:
      "Credit investment in the largest franchisee of HTeaO, a fast growing QSR that specializes in providing premium water and refreshing iced tea. The capital was used to fund store expansion through acquisition of existing stores and allowed the Operator to continue expanding in core markets.",
    website: { href: "https://www.hteao.com", label: "hteao.com" },
    image: {
      src: "/investments/hteao.png",
      width: 520,
      height: 360,
      treatment: "logo",
    },
  },
  {
    name: "Westfield Fluid Controls",
    status: "Current",
    kind: "Private Equity",
    year: "2026",
    blurb:
      "Equity investment in Westfield, an industry leader in the design, manufacture, assembly, and testing of powered and non-powered valves, solenoids, and fluid controls for aerospace and defense applications. Notable customers of Westfield include Boeing, Northrop Grumman, the Department of Defense, and more.",
    website: {
      href: "https://www.westfieldhydraulics.com",
      label: "westfieldhydraulics.com",
    },
    image: {
      src: "/investments/westfield.png",
      width: 760,
      height: 219,
      treatment: "logo",
    },
  },
  {
    name: "Marucci Sports",
    status: "Current",
    kind: "Private Equity",
    year: "2026",
    blurb:
      "Equity investment in the MBO of Marucci Sports from publicly traded FOXA. Marucci is the leading wood and composite bat maker in both college and professional baseball, with a recent push into softball and apparel. Marucci is the official bat of the MLB.",
    website: { href: "https://maruccisports.com", label: "maruccisports.com" },
    image: {
      src: "/investments/marucci.jpg",
      width: 900,
      height: 412,
      treatment: "photo",
    },
  },
];

/**
 * 36×36px at every width. design/DESIGN_SYSTEM.md § 9 permits a SPACED SECONDARY
 * control to sit below the ≥44×44px floor, and these qualify: secondary, 8px
 * clear of their neighbours, not repeated in a dense list. 36px is the floor that
 * exception allows, not a new default — do not copy this size onto a primary
 * action, a list row or a form control. Sizing lives in the className; this holds
 * only the theming.
 */
const arrowButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  flexShrink: 0,
};

const tag: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".04em",
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Read as an external store rather than as state set from an effect: the latter
 * trips react-hooks/set-state-in-effect and renders once with the wrong value.
 * The server snapshot is `false` so hydration matches, then React re-reads.
 */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Every slide is rendered and stacked in one grid cell; `active` fades between
 * them. Two things fall out of that which are worth keeping:
 *
 *  - The container sizes to the TALLEST slide, so the card never jumps as the
 *    carousel advances — no fixed height to overflow on a narrow screen.
 *  - All three write-ups are in the server-rendered HTML rather than appearing
 *    only on interaction, so a crawler or a JS-off reader sees the whole
 *    portfolio.
 *
 * `visibility` is what keeps an inactive slide's link out of the tab order; it
 * is delayed by the fade so the outgoing slide stays painted while it fades.
 */
function stackedSlide(active: boolean, instant: boolean): React.CSSProperties {
  return {
    gridArea: "1 / 1",
    opacity: active ? 1 : 0,
    visibility: active ? "visible" : "hidden",
    transition: instant
      ? "none"
      : `opacity ${FADE_MS}ms ease, visibility 0s linear ${active ? "0s" : `${FADE_MS}ms`}`,
  };
}

export function RecentInvestments() {
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const count = INVESTMENTS.length;

  // An element that moves on its own is exactly what prefers-reduced-motion is
  // for. With no play control on the page, honoring it means the carousel simply
  // does not auto-advance — the arrows still work.
  const reducedMotion = useReducedMotion();
  const playing = !stopped && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      AUTOPLAY_MS,
    );
    return () => window.clearInterval(id);
  }, [playing, count]);

  // Any manual move stops the autoplay for good — a carousel that keeps sliding
  // out from under someone who just took control is why people hate them.
  const goTo = useCallback((next: number) => {
    setStopped(true);
    setIndex(next);
  }, []);

  const prev = useCallback(
    () => goTo((index - 1 + count) % count),
    [goTo, index, count],
  );
  const next = useCallback(() => goTo((index + 1) % count), [goTo, index, count]);

  // Rendered in two places — top right, and flanking the dots below the card.
  const arrow = (direction: "prev" | "next") => (
    <button
      type="button"
      onClick={direction === "prev" ? prev : next}
      aria-label={direction === "prev" ? "Previous investment" : "Next investment"}
      className="h-9 w-9"
      style={arrowButton}
    >
      {direction === "prev" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  );

  return (
    <div style={{ background: C.bgAlt }}>
      <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-10 md:pb-24 md:pt-20">
        <div className="mb-10 flex flex-col gap-3">
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: C.accent,
            }}
          >
            Recent Investments
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 4.2vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: C.text,
            }}
          >
            Our Portfolio
          </h1>
        </div>

        <div
          className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-8"
          style={{
            padding: 24,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            background: C.bg,
          }}
        >
          {/* Image — fixed height so every slide is the same box. */}
          <div
            className="grid h-[200px] md:h-[280px]"
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.bg,
              overflow: "hidden",
            }}
          >
            {INVESTMENTS.map((investment, i) => {
              const isPhoto = investment.image.treatment === "photo";
              return (
                <div
                  key={investment.name}
                  aria-hidden={i !== index}
                  className={`relative flex items-center justify-center ${
                    isPhoto ? "p-0" : "p-5 md:p-8"
                  }`}
                  style={stackedSlide(i === index, reducedMotion)}
                >
                  {isPhoto ? (
                    <Image
                      src={investment.image.src}
                      alt={investment.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 520px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Image
                      src={investment.image.src}
                      alt={investment.name}
                      width={investment.image.width}
                      height={investment.image.height}
                      priority={i === 0}
                      style={{
                        display: "block",
                        width: "auto",
                        height: "auto",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Copy — grid-stacked, so the card sizes to the longest write-up. */}
          <div className="grid">
            {INVESTMENTS.map((investment, i) => (
              <div
                key={investment.name}
                aria-hidden={i !== index}
                className="flex flex-col justify-center gap-5"
                style={stackedSlide(i === index, reducedMotion)}
              >
                <div className="flex flex-col gap-2">
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      color: C.textDim,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1} of {count}
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(22px, 2.6vw, 28px)",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.2,
                      color: C.text,
                    }}
                  >
                    {investment.name}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    style={{
                      ...tag,
                      background: C.accentBg,
                      border: `1px solid ${C.accentBorder}`,
                      color: C.accent,
                    }}
                  >
                    {investment.kind}
                  </span>
                  <span
                    style={{
                      ...tag,
                      background: C.bgRow,
                      border: `1px solid ${C.border}`,
                      color: C.textMuted,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {investment.year}
                  </span>
                  {/* Green per the palette's convention: positive / active state. */}
                  <span
                    style={{
                      ...tag,
                      background: C.greenBg,
                      border: `1px solid ${C.greenBorder}`,
                      color: C.green,
                    }}
                  >
                    {investment.status}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 500,
                    lineHeight: 1.7,
                    color: C.textMuted,
                  }}
                >
                  {investment.blurb}
                </p>

                <a
                  href={investment.website.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center self-start"
                  style={{
                    gap: 6,
                    color: C.accent,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {investment.website.label}
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Arrows flanking the dots, mirroring the pair up top. */}
        <div className="flex items-center justify-center gap-4 pt-6">
          {arrow("prev")}
          <div className="flex items-center gap-2">
            {INVESTMENTS.map((investment, i) => (
              <button
                key={investment.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${investment.name}`}
                aria-current={i === index}
                style={{
                  width: i === index ? 28 : 6,
                  height: 6,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  background: i === index ? C.accent : C.borderStrong,
                  transition: reducedMotion ? "none" : `width ${FADE_MS}ms ease`,
                }}
              />
            ))}
          </div>
          {arrow("next")}
        </div>
      </div>
    </div>
  );
}
