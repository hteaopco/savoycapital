/**
 * The motion and weights for a panel that hangs off a card on a connector line.
 *
 * Extracted 2026-08-24, when the Deal Room grew a second one of these ("Why We
 * Like It", beside the Investment card) and the first — `FundAllocation`'s
 * holding-detail panel — had the numbers as local literals. Two copies of four
 * magic numbers on two screens is precisely the drift `ui-governance.md` § 3
 * names as permanently the reviewer's job: "the same concept badged two
 * different ways on two surfaces ... consistency is cross-file and the lint is
 * per-file." One import removes the question.
 *
 * The values are unchanged from `FundAllocation`'s, and the reasoning is its —
 * repeated here because a constant with its argument left behind in the file it
 * moved out of is a constant somebody will "tidy":
 *
 * The connector and the edge start TOGETHER and the slower one finishes last,
 * so the sequence lands on `DESIGN_SYSTEM.md` § 0.8's 200ms ceiling instead of
 * summing to 300. Opening a panel is UI feedback, so § 0.8's 400ms
 * content-crossfade carve-out does not apply and 200ms is the whole budget —
 * slowing the edge further means taking it out of the connector, never adding
 * to the total.
 *
 * **This file deliberately holds no geometry.** Where a panel sits, how wide it
 * is, and the breakpoint it floats at are all per-screen arithmetic that has to
 * be re-done from that screen's own widths — see each call site. Sharing those
 * would make one screen's layout silently depend on the other's card width.
 */

/** The line's sweep, left to right, from the card's border out to the panel. */
export const CONNECTOR_MS = 100;

/** The accent rule across the panel's top edge. */
export const EDGE_MS = 200;

/** The panel body's crossfade, and the beat it waits before starting. */
export const FADE_MS = 150;
export const FADE_DELAY_MS = 50;

/** Hairline for the connector; the panel's top edge is drawn twice as heavy. */
export const CONNECTOR_WEIGHT = 1;
export const EDGE_WEIGHT = 2;
