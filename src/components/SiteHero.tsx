import Image from "next/image";
import { C } from "./palette";
import { display } from "./type";
import { HERO_IMAGE } from "@/content/site-imagery";

/**
 * The landing page's hero: a full-bleed photograph, a scrim, and one line.
 *
 * ## One line, and nothing else
 *
 * No subhead, no button, no scroll indicator (owner's build spec, 2026-09-06).
 * Because the headline is the only copy on the screen it has to look
 * deliberate — hence the height, the lower-third placement, and the real air
 * below the line before the fold. A second element here would read as a hero
 * that could not carry itself on one.
 *
 * The `<h1>`. The page has exactly one, and it is this — section headings below
 * are `<h2>`.
 *
 * ## The scrim is a contrast device, not a mood
 *
 * A photograph is the one place on this product where the failure mode is
 * *contrast* rather than a wrong token. `DESIGN_SYSTEM.md` § 7 sets 4.5:1 for
 * body text, and the gradient below is sized to clear it against the actual
 * photograph — **not against a flat swatch**, which is the mistake that ships
 * type nobody can read.
 *
 * It runs dark-to-lighter left-to-right because the words are on the left, so
 * the picture keeps whatever it has on the right. **Do not lighten it to show
 * more of the image without re-measuring the headline against the real file.**
 *
 * The palette did not move to allow any of this: `design/README.md` § "The gap
 * this folder does not cover" licenses a marketing pattern the exemplars do not
 * demonstrate, and says in the same breath not to resolve it by loosening the
 * palette. So the scrim is `C.overlayStrong` → `C.overlay`, the type is
 * `C.onSolid`, and the ground behind a not-yet-loaded image is `C.text`.
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
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      {/*
        Two layers, and both earn their place.

        The horizontal gradient is the headline's contrast. The flat wash on top
        of it is what the owner asked for on 2026-09-06 ("put some transparency
        over it") — it holds the whole picture back a stop so the photograph
        reads as a ground rather than as the subject, which is what lets one
        line of type hold a 70vh frame.

        It holds no content, so it needs no `aria-hidden`; it only has to sit
        above the image and below the words, which is what the ordering does.
      */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, ${C.overlayStrong}, ${C.overlay})`,
        }}
      />
      <div
        style={{ position: "absolute", inset: 0, background: C.overlay }}
      />

      {/*
        Roughly 70vh, floored so it cannot collapse on a short window and capped
        so it cannot swallow a laptop screen. The content sits in the lower
        third and the padding below is what keeps the line from looking dropped
        at the bottom edge.
      */}
      <div className="relative mx-auto flex min-h-[440px] max-w-[1120px] flex-col justify-end px-5 pb-16 pt-24 md:min-h-[70vh] md:px-10 md:pb-24 md:pt-40">
        {/*
          ~600px measure per the spec: the line holds the frame on desktop
          without wrapping, and wraps naturally on a phone.
        */}
        <h1
          className="max-w-[600px]"
          style={{ ...display, color: C.onSolid, textWrap: "pretty" }}
        >
          Operating experience, applied to capital.
        </h1>
      </div>
    </div>
  );
}
