import Image from "next/image";
import { C } from "./palette";
import { display, heroLead } from "./type";
import { HERO_IMAGE } from "@/content/site-imagery";

/**
 * The landing page's opening — a full-bleed photographic hero.
 *
 * ## Why there is a photograph here at all
 *
 * The page had no imagery beyond four portfolio logos, and that is what made it
 * read as generated (owner, 2026-09-06: "i think its a lack of graphics …
 * can you put more images? maybe something professional like a sky scraper
 * backdrop?"). An earlier pass fixed the page's STRUCTURE and left it looking
 * the same, because structure was not the complaint.
 *
 * `design/README.md` § "The gap this folder does not cover" is the licence for
 * this: `design/` is an internal-application design system — tables, modals,
 * pills — and it says outright that a marketing surface needs patterns no
 * exemplar demonstrates. A photographic hero is one of them. **What does not
 * get loosened is the palette**: the scrim, the text and the rule below are all
 * `C` tokens, which is that section's other instruction.
 *
 * ## The scrim is two tokens, not an rgba literal
 *
 * `C.overlayStrong` → `C.overlay` left to right: heaviest where the words are,
 * lifting across the building so the corner is still legible. Both are palette
 * tokens, so `design-lint`'s `raw-rgba` rule stays satisfied and the darkness
 * stays tied to the palette's slate rather than to a hand-mixed black.
 *
 * A photograph with type on it is the one place this product has a *contrast*
 * problem rather than a token problem: `DESIGN_SYSTEM.md` § 7 wants ≥4.5:1 for
 * body text, and a scrim is what buys it. Do not lighten it to show more of the
 * picture without checking the text against the brightest region behind it —
 * which for this image is the sky, exactly where the headline sits.
 *
 * ## Copy is unchanged and still gated
 *
 * Both lines are the site's own `<meta name="description">` split in two, as
 * before. `FACTS.md` § "securities marketing" is still open, so nothing here
 * claims performance, returns or availability. A photograph is not a claim; a
 * sentence about what Savoy looks for would be. Do not add one.
 */
export function SiteHero() {
  return (
    <div style={{ position: "relative", background: C.text, overflow: "hidden" }}>
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        // Above the fold and the largest paint on the page: preload it rather
        // than letting the headline land on bare slate first.
        priority
        sizes="100vw"
        // `cover` crops, and the crop is deliberate: the source is a wide band
        // whose left half is sky, so a narrow viewport keeps the words' side of
        // the picture and loses the building's edge rather than the reverse.
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      {/* The scrim. `aria-hidden` is unnecessary — it holds no content — but it
          must sit above the image and below the words, hence the ordering. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, ${C.overlayStrong}, ${C.overlay})`,
        }}
      />

      <div className="relative mx-auto flex min-h-[420px] max-w-[1120px] flex-col justify-end px-5 py-16 md:min-h-[560px] md:px-10 md:py-20">
        <div className="flex max-w-[760px] flex-col gap-6 md:gap-7">
          <h1 style={{ ...display, color: C.onSolid, textWrap: "pretty" }}>
            Private equity and private debt.
          </h1>
          <p
            style={{
              ...heroLead,
              // Not `C.textMuted`: that is a slate meant for a white page and
              // it fails against a photograph. On a solid tone the palette's
              // answer is `onSolid`, held back with opacity so the line still
              // sits under the headline rather than beside it.
              color: C.onSolid,
              opacity: 0.82,
              maxWidth: 560,
              textWrap: "pretty",
            }}
          >
            Savoy Capital is a private investment fund.
          </p>
        </div>
      </div>
    </div>
  );
}
