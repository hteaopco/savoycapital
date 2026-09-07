import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { C } from "./palette";
import { INVESTMENTS } from "@/content/investments";

/** A badge. Radius 4 per `DESIGN_SYSTEM.md` § 2 and § 4. */
const tag: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".04em",
};

/** Neutral, because instrument and year are categories rather than states. */
const categoryTag: React.CSSProperties = {
  ...tag,
  background: C.bgRow,
  border: `1px solid ${C.border}`,
  color: C.textMuted,
  fontWeight: 700,
};

/**
 * The portfolio, as a static 2×2 grid.
 *
 * ## Why this replaced the carousel
 *
 * > "Four investments displayed reads as substance; four investments hidden
 * > behind arrows reads as padding." — owner's build spec, 2026-09-06
 *
 * `RecentInvestments.tsx` — the crossfading carousel with autoplay, arrows,
 * dots and a `1 OF 4` counter — was deleted for this. Gone with it: the
 * `2 OF 4` and `4 INVESTMENTS` counters, the prev/next controls, and the
 * `RECENT INVESTMENTS` eyebrow above the heading (all named in the spec).
 *
 * **Three things the carousel carried are worth not re-inventing.** It rendered
 * every slide server-side so a crawler saw the whole portfolio — a grid does
 * that by construction. It honoured `prefers-reduced-motion` by not
 * auto-advancing — a grid has nothing to advance. And its arrows sat at 36px
 * under § 0.8's spaced-secondary carve-out — there are no arrows now, so the
 * carve-out is unused on this page and the only control left is a card's link.
 *
 * ## The card
 *
 * Kept from the carousel deliberately (spec: "keep the existing card
 * treatment"): the same 1px `C.border`, radius 12, no shadow, the same
 * badge row, the same logo-panel-then-copy arrangement. What changed is that
 * the panel is stacked above the copy rather than beside it, because at half
 * the page width a side-by-side split gives the write-up about 200px.
 *
 * The image frame carries no border of its own and stays white — the logo or
 * photo defines its own region (§ 0.5), and `hteao.png` has an opaque white
 * background baked in, so tinting the frame would render it as a hard slab.
 * Measured, not assumed; see the file's own pixels.
 */
export function PortfolioGrid() {
  return (
    <div style={{ background: C.bgAlt }}>
      <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-10 md:py-24">
        <h2
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: C.text,
          }}
        >
          Portfolio
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-12 md:grid-cols-2 md:gap-8">
          {INVESTMENTS.map((investment) => {
            const isPhoto = investment.image.treatment === "photo";
            return (
              <div
                key={investment.name}
                className="flex flex-col"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  background: C.bg,
                  overflow: "hidden",
                }}
              >
                {/* The logo panel. Fixed height so all four cards line up
                    regardless of how long a write-up runs. */}
                <div
                  className={`relative flex h-[160px] items-center justify-center md:h-[180px] ${
                    isPhoto ? "p-0" : "p-8"
                  }`}
                  style={{ background: C.bg }}
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

                <div
                  className="flex flex-1 flex-col gap-4 p-6"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.25,
                      color: C.text,
                    }}
                  >
                    {investment.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* A badge's tone encodes STATE, never category — the
                        standing rule (DECISIONS 2026-08-24). Instrument and
                        year are neutral; "Current" is green because green
                        means a positive state and nothing else. */}
                    <span style={categoryTag}>{investment.kind}</span>
                    <span
                      style={{
                        ...categoryTag,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {investment.year}
                    </span>
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
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.65,
                      color: C.textMuted,
                      textWrap: "pretty",
                    }}
                  >
                    {investment.blurb}
                  </p>

                  {/* Pushed to the card's foot so all four links sit on one
                      line regardless of how long the write-ups run. */}
                  <a
                    href={investment.website.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center self-start min-h-[44px] md:min-h-0"
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
