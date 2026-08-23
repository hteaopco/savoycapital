"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "./palette";

type Investment = {
  name: string;
  /** Instrument tag. Bracketed until the real terms are confirmed. */
  kind: string;
  /** Year of investment. Bracketed until confirmed. */
  year: string;
  blurb: string;
  image: {
    src: string;
    width: number;
    height: number;
    /**
     * "logo" sits centered on a white panel with padding; "photo" fills the
     * frame edge to edge. The three supplied assets are not the same kind of
     * image — see uploads/README.md — so the panel adapts rather than
     * pretending they are.
     */
    treatment: "logo" | "photo";
    /** Cap on rendered logo height, so marks of different aspect ratios read at a similar weight. */
    maxHeight?: number;
  };
};

const INVESTMENTS: Investment[] = [
  {
    name: "Westfield Fluid Controls",
    kind: "[EQUITY / DEBT]",
    year: "[YEAR]",
    blurb: "[TBD — write-up for Westfield Fluid Controls.]",
    image: {
      src: "/investments/westfield.png",
      width: 760,
      height: 219,
      treatment: "logo",
      maxHeight: 180,
    },
  },
  {
    name: "HTeaO",
    kind: "[EQUITY / DEBT]",
    year: "[YEAR]",
    blurb: "[TBD — write-up for HTeaO.]",
    image: {
      src: "/investments/hteao.png",
      width: 520,
      height: 360,
      treatment: "logo",
      maxHeight: 220,
    },
  },
  {
    name: "Marucci Sports",
    kind: "[EQUITY / DEBT]",
    year: "[YEAR]",
    blurb: "[TBD — write-up for Marucci Sports.]",
    image: {
      src: "/investments/marucci.jpg",
      width: 900,
      height: 412,
      treatment: "photo",
    },
  },
];

const navButton: React.CSSProperties = {
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

export function RecentInvestments() {
  const [index, setIndex] = useState(0);
  const count = INVESTMENTS.length;

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count],
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  const current = INVESTMENTS[index];

  return (
    <div style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-10 md:py-20">
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
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(24px, 3.2vw, 32px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: C.text,
              }}
            >
              Where the capital has gone.
            </h2>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={prev} aria-label="Previous investment" style={navButton}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={next} aria-label="Next investment" style={navButton}>
              <ChevronRight size={18} />
            </button>
          </div>
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
          <div
            className="flex items-center justify-center"
            style={{
              position: "relative",
              minHeight: 220,
              padding: current.image.treatment === "logo" ? 32 : 0,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.bg,
              overflow: "hidden",
            }}
          >
            {current.image.treatment === "logo" ? (
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
                  maxHeight: current.image.maxHeight,
                  objectFit: "contain",
                }}
              />
            ) : (
              <Image
                src={current.image.src}
                alt={current.name}
                fill
                sizes="(max-width: 768px) 100vw, 520px"
                style={{ objectFit: "cover" }}
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
              <h3
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
              </h3>
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
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-6 md:justify-center">
          <div className="flex items-center gap-2">
            {INVESTMENTS.map((investment, i) => (
              <button
                key={investment.name}
                type="button"
                onClick={() => setIndex(i)}
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

          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={prev} aria-label="Previous investment" style={navButton}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={next} aria-label="Next investment" style={navButton}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
