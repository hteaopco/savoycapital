"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import { C } from "./palette";

const AUTOPLAY_MS = 3000;

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
     * "logo" sits centered inside the panel's padding; "photo" fills the frame
     * edge to edge. The supplied assets are not the same kind of image (see
     * uploads/README.md), so the panel adapts rather than pretending they match.
     *
     * The PANEL's height is fixed either way (h-[200px] md:h-[280px] on the
     * container below). That is what keeps all three slides the same size
     * regardless of the image's aspect ratio.
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

const controlButton: React.CSSProperties = {
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
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

export function RecentInvestments() {
  const [index, setIndex] = useState(0);
  const count = INVESTMENTS.length;

  // An element that moves on its own is exactly what prefers-reduced-motion is
  // for, so it sets the DEFAULT. An explicit press of the button overrides it in
  // either direction — a play button that does nothing would be worse than not
  // honoring the preference at all.
  const reducedMotion = useReducedMotion();
  const [override, setOverride] = useState<boolean | null>(null);
  const playing = override ?? !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      AUTOPLAY_MS,
    );
    return () => window.clearInterval(id);
  }, [playing, count]);

  // Any manual move stops the autoplay — a carousel that keeps sliding out from
  // under someone who just took control is the whole reason people hate them.
  const goTo = useCallback((next: number) => {
    setOverride(false);
    setIndex(next);
  }, []);

  const prev = useCallback(
    () => goTo((index - 1 + count) % count),
    [goTo, index, count],
  );
  const next = useCallback(() => goTo((index + 1) % count), [goTo, index, count]);

  const current = INVESTMENTS[index];
  const isPhoto = current.image.treatment === "photo";

  const controls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOverride(!playing)}
        aria-label={playing ? "Pause automatic rotation" : "Resume automatic rotation"}
        aria-pressed={!playing}
        style={controlButton}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <button type="button" onClick={prev} aria-label="Previous investment" style={controlButton}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={next} aria-label="Next investment" style={controlButton}>
        <ChevronRight size={18} />
      </button>
    </div>
  );

  return (
    <div style={{ background: C.bgAlt }}>
      <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-10 md:pb-24 md:pt-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
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

          <div className="hidden md:block">{controls}</div>
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
          {/*
           * Fixed height, not min-height. Previously the panel grew to fit the
           * image, so HTeaO's taller mark made its slide taller than the other
           * two and the card resized as the carousel advanced. The panel is now
           * a constant box and every image is contained inside it.
           */}
          <div
            className={`flex h-[200px] items-center justify-center md:h-[280px] ${
              isPhoto ? "p-0" : "p-5 md:p-8"
            }`}
            style={{
              position: "relative",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.bg,
              overflow: "hidden",
            }}
          >
            {isPhoto ? (
              <Image
                src={current.image.src}
                alt={current.name}
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <Image
                src={current.image.src}
                alt={current.name}
                width={current.image.width}
                height={current.image.height}
                priority={index === 0}
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

          <div className="flex flex-col justify-center gap-5">
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
                {index + 1} of {count}
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
                  {current.name}
                </h2>
                {/* Green per the palette's convention: positive / active state. */}
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: C.greenBg,
                    border: `1px solid ${C.greenBorder}`,
                    color: C.green,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".04em",
                  }}
                >
                  {current.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: C.accentBg,
                  border: `1px solid ${C.accentBorder}`,
                  color: C.accent,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".04em",
                }}
              >
                {current.kind}
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: C.bgRow,
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {current.year}
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
              {current.blurb}
            </p>

            <a
              href={current.website.href}
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
              {current.website.label}
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-6 md:justify-center">
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
                }}
              />
            ))}
          </div>

          <div className="md:hidden">{controls}</div>
        </div>
      </div>
    </div>
  );
}
