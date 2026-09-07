import Image from "next/image";
import { C } from "./palette";
import { display, eyebrow, heroLead } from "./type";
import { APPROACH, HEADQUARTERS } from "@/content/site";
import { HERO_IMAGE } from "@/content/site-imagery";

/**
 * The landing page's opening: headline, positioning paragraph and the three
 * facts, all composed over one photograph.
 *
 * ## This supersedes the spec's hero, on the owner's instruction
 *
 * The 2026-09-06 build spec said "one line of copy only — no subhead, no
 * button", with the approach paragraph and the facts row as separate bands
 * below. The owner moved all three into the image on 2026-09-07: headline to
 * the top half, then the paragraph, then the facts. **Do not "restore" the spec
 * version** — the spec is the older instruction and this is the newer one.
 *
 * That is also why the headline sits at the top rather than the lower third:
 * it is making room, not being decorative.
 *
 * ## Everything over a photograph is a contrast problem
 *
 * `DESIGN_SYSTEM.md` § 7 sets 4.5:1 for body text, and with three tiers of copy
 * on the image instead of one, three things have to clear it — not just the
 * headline. So:
 *
 *  - **`C.onSolid` for all of it.** `C.textMuted` is a slate meant for a white
 *    page and it fails against a picture; the palette's answer on a solid tone
 *    is `onSolid`, held back with opacity where a line needs to sit quieter.
 *  - **Two scrim layers.** A horizontal gradient carries the left column where
 *    the words are, and a flat wash over it holds the whole picture back a stop
 *    (owner, 2026-09-06: "put some transparency over it").
 *
 * **Measure against the real file before lightening either layer.** A scrim
 * tuned against a flat swatch is how unreadable type ships.
 *
 * The `<h1>`. The page has exactly one and it is here.
 */
export function SiteHero({
  committedCapital,
  investmentCount,
}: {
  committedCapital: string | null;
  investmentCount: number;
}) {
  // Committed capital is absent whenever the database is unreachable — the
  // block drops rather than showing a fallback. See `loadCommittedCapitalCents`.
  const facts = [
    ...(committedCapital
      ? [{ value: committedCapital, label: "Committed capital" }]
      : []),
    { value: String(investmentCount), label: "Current investments" },
    { value: HEADQUARTERS, label: "Headquarters" },
  ];

  return (
    <div style={{ position: "relative", background: C.text, overflow: "hidden" }}>
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, ${C.overlayStrong}, ${C.overlay})`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: C.overlay }} />

      {/*
        Content starts at the TOP and flows down, rather than being pinned to
        the bottom. The min-height is a floor, not a fixed height: with three
        tiers of copy the block sizes itself, and a fixed height would either
        clip it on a phone or strand it on a tall desktop window.
      */}
      <div className="relative mx-auto flex min-h-[520px] max-w-[1120px] flex-col justify-start px-5 pb-16 pt-16 md:min-h-[640px] md:px-10 md:pb-20 md:pt-24">
        <h1
          className="max-w-[600px]"
          style={{ ...display, color: C.onSolid, textWrap: "pretty" }}
        >
          Operating experience, applied to capital.
        </h1>

        <p
          className="mt-10 max-w-[600px] md:mt-14"
          style={{
            ...heroLead,
            color: C.onSolid,
            // Held back so it reads under the headline rather than beside it,
            // and still well clear of the 4.5:1 floor on this scrim.
            opacity: 0.9,
            textWrap: "pretty",
          }}
        >
          {APPROACH}
        </p>

        {/*
          The facts, on a rule. Three discrete blocks — not a middle-dot-joined
          string, no icons, no cards (spec § 4, which survives the move). The
          rule is the only chrome here and it earns it: it separates a claim
          about the firm from figures about it.
        */}
        {/*
          The rule is its own element rather than a `borderTop`, because a
          border needs a COLOR and there is no palette token for "white at 20%".
          Appending an alpha suffix to `C.onSolid` would have produced exactly
          that — a fabricated color that passes `raw-hex` (no `#` in the source)
          and is still a value the palette never defined. Opacity on a real
          token is the honest version of the same effect, and it is what the
          copy above already does.
        */}
        <div
          aria-hidden
          className="mt-10 md:mt-12"
          style={{ height: 1, background: C.onSolid, opacity: 0.25 }}
        />

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:gap-16">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1.5">
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  color: C.onSolid,
                  // Every value here reads as a figure, the city included —
                  // lining them up is what makes them read as one set.
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fact.value}
              </div>
              <div style={{ ...eyebrow, color: C.onSolid, opacity: 0.72 }}>
                {fact.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
