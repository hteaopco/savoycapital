/**
 * Photography on the PUBLIC site, and where each image came from.
 *
 * ## Why this is a content module and not a literal in the component
 *
 * Same reason as `investments.ts`: the component holds the treatment, the
 * content module holds the thing. Swapping the hero image is then one edit here
 * rather than surgery in `SiteHero.tsx`.
 *
 * ## Why the licence is recorded in code rather than in a doc
 *
 * An image on a fund's public website is a licensing question, not a styling
 * one, and the answer has to travel with the file. A doc in `.claudet/` would
 * rot away from `public/`; this sits next to the only thing that references it,
 * so anyone swapping the image sees what the last one's terms were and that
 * they owe the same answer for the new one.
 *
 * **Do not add an image here without recording where it came from and under
 * what licence.** "Found a nice photo" is how an unlicensed asset ends up on a
 * public marketing surface for a regulated business.
 */

export type SiteImage = {
  src: string;
  width: number;
  height: number;
  /** Alt text. Describes the picture, not the brand. */
  alt: string;
  /** Where the file came from. */
  source: string;
  /** The licence, named exactly. */
  licence: string;
  /** Whether anything must be shown to a viewer for the licence to be met. */
  attributionRequired: boolean;
};

/**
 * The landing page's hero backdrop (owner, 2026-09-06: "can you put more
 * images? maybe something professional like a sky scraper backdrop?").
 *
 * **This is a stand-in with a clean licence, not a brand decision.** It is a
 * Historic American Buildings Survey photograph — a work of the US federal
 * government, so public domain with no attribution obligation, and verifiable
 * at the Library of Congress URL below rather than resting on a stock site's
 * blanket terms. That was the whole selection criterion: a fund's public page
 * is the wrong place to discover an image's terms were not what someone assumed.
 *
 * It is a real building Savoy has no connection to. **If Savoy has photography
 * of its own** — its offices, its city, its portfolio companies — that is
 * strictly better and this is one line to replace.
 *
 * Prepared from the source scan by cropping away the archival film border and
 * the handwritten HABS plate number, taking a wide band from the top so the sky
 * carries the headline, and downsampling to 2400px wide greyscale.
 */
export const HERO_IMAGE: SiteImage = {
  src: "/site/tower.jpg",
  width: 2400,
  height: 1090,
  alt: "The upper corner of an early high-rise office building, photographed from street level against an open sky.",
  source:
    "Historic American Buildings Survey, Equitable Building, Atlanta, GA (HABS GA-2107-8) — https://www.loc.gov/pictures/item/ga0118.photos.056674p",
  licence: "Public domain (work of the US federal government)",
  attributionRequired: false,
};
