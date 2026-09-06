import { C } from "./palette";
import { display, heroLead } from "./type";

/**
 * The landing page's opening.
 *
 * ## Why this exists
 *
 * Before it, the public site was a nav bar and a carousel on a tinted field —
 * the first words a visitor read were "Recent Investments / Our Portfolio", a
 * section header with no firm behind it. That is what made the page read as a
 * component demo rather than a fund's website (owner, 2026-09-06: "I don't like
 * the landing page … make it more professional"). This gives the page a subject
 * before it shows a list.
 *
 * ## The copy is DELIBERATELY this thin, and it is not a placeholder
 *
 * `FACTS.md` § "securities marketing" is **still open**: a public page marketing
 * a private fund is constrained by exemptions (Reg D and the general-solicitation
 * limits around it) that nobody here should guess at, and it gates anything about
 * **performance, returns or availability**.
 *
 * So both lines below say only what the site ALREADY says publicly — they are the
 * `<meta name="description">` in `src/app/layout.tsx`, split in two. No new claim
 * enters the public surface, and nothing here needs counsel's sign-off that the
 * page had not already taken.
 *
 * **Do not "improve" this by adding a value proposition.** A sentence about what
 * Savoy looks for, how it invests, or who it invests alongside is exactly the
 * territory that is gated. When counsel answers, the answer arrives as copy for
 * this component — not as a licence to write it here first. Same rule as
 * `src/content/investments.ts`'s header.
 *
 * ## No call to action, on purpose
 *
 * `design/DESIGN_SYSTEM.md` § 0.2 — one primary action per screen. The nav's
 * "Investor Portal" is that action; a second button here would make neither
 * primary. It also would not mean anything: the portal is for two named people,
 * not a signup.
 */
export function SiteHero() {
  return (
    <div style={{ background: C.bg }}>
      <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-10 md:py-24">
        {/*
          A measure, not the full column. `DESIGN_SYSTEM.md` § 0.5 — negative
          space is the layout. The headline stopping well short of the right
          edge is what gives the page air without a single added border.
        */}
        <div className="flex max-w-[760px] flex-col gap-6 md:gap-7">
          <h1 style={{ ...display, color: C.text, textWrap: "pretty" }}>
            Private equity and private debt.
          </h1>
          <p
            style={{
              ...heroLead,
              color: C.textMuted,
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
