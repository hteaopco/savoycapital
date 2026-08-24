"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { C } from "./palette";
import { bodyLead, display, displaySm, eyebrow } from "./type";

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
     * "logo" sits centered inside the slide's padding; "photo" runs edge to
     * edge with no padding. The supplied assets are not the same kind of image
     * (see uploads/README.md), so the slide adapts rather than pretending they
     * match.
     *
     * **Neither one crops any more** (owner, 2026-08-24: "the other photos look
     * good, but this one is still clipped"). "photo" used `cover`, which fills
     * the frame by scaling up and slicing off whatever does not fit — on a
     * 900x412 image in a ~478x280 frame that took the left third away,
     * including the text baked into it. The difference between the two
     * treatments is now padding alone.
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

/**
 * A badge. `borderRadius: 4` is `DESIGN_SYSTEM.md` § 2's badge/pill step and
 * § 4's "circular / pill badges — always rectangle `borderRadius: 4`", which
 * supersedes `AP_DESIGN_REFERENCE.md` § 4's status pill at 8 (owner, 2026-08-24;
 * see that file's banner). The portal's "% DEPLOYED" pill is the same 4.
 */
const tag: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".04em",
};

/**
 * The instrument badge is NEUTRAL, and that is the fix for a real collision
 * rather than a style preference.
 *
 * It used to be accent-tinted on every slide. Meanwhile the portal's chart paints
 * Private Equity accent and Private Credit green — so "Private Credit" read blue
 * here and green there, and green meant "Private Credit" in one place and
 * "Current" in the other. `DESIGN_SYSTEM.md` § 0.3: color = meaning, never
 * decoration; § 4 forbidden: "accent color used decoratively — reserved for
 * primary action and active state."
 *
 * The rule the two surfaces now share: **a badge's tone encodes STATE, never
 * category.** Instrument is a category, so it is neutral. "Current" is a positive
 * state, so it stays green and green means exactly that. The donut keeps accent
 * and green as ARC IDENTITY — a chart is a separate vocabulary the design system
 * has no words for (see `FundAllocation.tsx`'s header), and its legend chips
 * mirror the arcs rather than badging anything.
 */
const categoryTag: React.CSSProperties = {
  ...tag,
  background: C.bgRow,
  border: `1px solid ${C.border}`,
  color: C.textMuted,
  fontWeight: 700,
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
          <div style={{ ...eyebrow, color: C.accent }}>Recent Investments</div>
          <h1 style={{ ...display, color: C.text }}>Our Portfolio</h1>
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
                  // The logo's breathing room moved into its own inset box
                  // above, so the slide itself no longer carries padding —
                  // leaving it here would inset the absolute box twice.
                  className="relative flex items-center justify-center"
                  style={stackedSlide(i === index, reducedMotion)}
                >
                  {isPhoto ? (
                    <Image
                      src={investment.image.src}
                      alt={investment.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 520px"
                      priority={i === 0}
                      // `contain`, not `cover`. Cover fills the frame by
                      // scaling up and cropping the overflow, which on a
                      // 900x412 photo in a ~478x280 frame cut off the left
                      // third — text included. Contain shows the whole image
                      // and letterboxes it against the card instead.
                      //
                      // Edge to edge still means something: a photo carries no
                      // padding, a logo does. That is now the only difference.
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    /*
                      A logo is `fill` + `contain` inside an absolutely INSET
                      box, not an intrinsically-sized <Image> capped by
                      `maxHeight: 100%` (owner, 2026-08-24: "the logos are not
                      centered and are being clipped by the box they sit in").

                      What was wrong: the old version sized the image from its
                      intrinsic 520x360 and relied on `max-height: 100%` to
                      clamp it. That percentage has to resolve through a
                      stretched grid item to the slide's content box, and when
                      it does not resolve the image keeps its width-driven
                      height — 414px of content width on a 520x360 logo wants
                      287px against 216px of room — and `overflow: hidden` on
                      the frame cuts the difference off the bottom. Which is
                      exactly what it looked like.

                      Why this construction instead: `contain` scales the image
                      to fit ENTIRELY inside its box and centres it on both
                      axes. It cannot clip and it cannot sit off-centre, by
                      definition rather than by a chain of resolved
                      percentages. The `inset` box is absolute so its size comes
                      from the slide's padding box directly, with no percentage
                      height anywhere in the chain. `inset-5`/`md:inset-8` are
                      the p-5/md:p-8 this replaces, to the pixel — 20 and 32.
                    */
                    <div className="absolute inset-5 md:inset-8">
                      <Image
                        src={investment.image.src}
                        alt={investment.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 520px"
                        priority={i === 0}
                        style={{ objectFit: "contain" }}
                      />
                    </div>
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
                  <h2 style={{ ...displaySm, color: C.text }}>
                    {investment.name}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span style={categoryTag}>{investment.kind}</span>
                  <span
                    style={{ ...categoryTag, fontVariantNumeric: "tabular-nums" }}
                  >
                    {investment.year}
                  </span>
                  {/* The ONLY toned badge on this card. Green = positive state,
                      and now nothing else on either surface says green for a
                      category — see `categoryTag` above. */}
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

                <p style={{ ...bodyLead, color: C.textMuted }}>
                  {investment.blurb}
                </p>

                {/*
                  A standalone control, not a link inside prose — it sits on its own
                  line under the write-up, so § 7's floor applies to it the way it
                  applies to any other control a thumb hits. Measured 20px tall before
                  this. 44 on touch, its own density from md up, same split the rest of
                  this file runs on.
                */}
                <a
                  href={investment.website.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center self-start min-h-[44px] md:min-h-0"
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
          {/*
            The dot is the INDICATOR; the button around it is the target.

            The bar itself is 6px tall — far under § 7's floor and under WCAG 2.2
            AA's 24×24 minimum, with the three sitting 8px apart so the spacing
            exception does not rescue them either. It was the only control on
            either surface that failed outright.

            Fixed the way this repo already fixes tap targets: the hit area grows
            on TOUCH and the desktop tree is byte-identical. On mobile each button
            is 24×44 (9px of transparent padding either side of the bar) with the
            row's gap collapsed to 0 so the padding supplies the spacing; from
            `md:` up the padding goes away and the original 8px gap returns. A
            pointer is not a thumb — the same reading `FundAllocation` runs on.

            Sizing lives in the className, theming in the style prop.

            **24 wide is where this stops, by the owner's call (2026-08-24):
            "Leave them."** Taking the buttons to a full 44×44 was offered and
            declined — at three dots plus two arrows it visibly spreads the row,
            and the owner weighed that against a width that already clears WCAG
            2.2 AA's 24×24 minimum. So this is a settled trade, not an
            outstanding finding: **do not "fix" it on a later sweep.** The height
            is the part that was broken and the height is fixed. Rationale in
            `.claudet/DECISIONS.md`.
          */}
          <div className="flex items-center gap-0 md:gap-2">
            {INVESTMENTS.map((investment, i) => (
              <button
                key={investment.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${investment.name}`}
                aria-current={i === index}
                // No `padding` here: an inline value beats the Tailwind class and
                // the touch target would silently stay 6px wide while reading as
                // fixed. Sizing is the className's job, theming is this prop's.
                className="flex items-center justify-center min-h-[44px] px-[9px] py-0 md:min-h-0 md:px-0"
                style={{ border: "none", background: "transparent" }}
              >
                <span
                  style={{
                    display: "block",
                    width: i === index ? 28 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: i === index ? C.accent : C.borderStrong,
                    transition: reducedMotion ? "none" : `width ${FADE_MS}ms ease`,
                  }}
                />
              </button>
            ))}
          </div>
          {arrow("next")}
        </div>
      </div>
    </div>
  );
}
