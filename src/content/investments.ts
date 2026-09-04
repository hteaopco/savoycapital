import type { Investment } from "@/components/RecentInvestments";

/**
 * The portfolio companies shown on the PUBLIC page's "Our Portfolio" carousel.
 *
 * Lifted out of `RecentInvestments.tsx` on 2026-09-04, when Mallard Bay was
 * added. `CLAUDE.md`'s NO HARDCODING rule names this case exactly — "no amounts,
 * no position names ... written as a literal inside `src/components/**`" — and
 * three position names had been sitting in the component since it was built.
 * Adding a fourth would have been a fourth violation rather than a first.
 *
 * The TYPE stays in the component and this file imports it, matching how
 * `src/lib/portfolio.ts` imports `DetailRow` from `FundAllocation`.
 *
 * ## This is the PUBLIC surface
 *
 * Everything here is readable by anyone on the internet. **No amounts, no
 * ownership percentages, no marks, no returns** — a name, an instrument, a year,
 * a status and a description of what the company does. That line is not a style
 * preference: `FACTS.md` § "securities marketing" records that a public page
 * marketing a private fund is constrained by exemptions nobody here should
 * guess at, and it is still open pending counsel. Anything about performance,
 * returns or availability goes past counsel before it goes here.
 *
 * `kind` should agree with the deal's `instrument` in the database, which is
 * what the Portfolio chart buckets on. Nothing enforces that — two surfaces,
 * one concept, and `ui-governance.md` § 3 names cross-file agreement as
 * permanently the reviewer's job.
 *
 * **Order is deal order, and it is load-bearing.** The carousel opens on entry
 * one, so appending rather than prepending is what keeps a new investment from
 * silently changing which slide the public page leads with.
 */
export const INVESTMENTS: Investment[] = [
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
  {
    name: "Mallard Bay Outdoors",
    status: "Current",
    kind: "Private Equity",
    year: "2026",
    blurb:
      "Equity investment in Mallard Bay, an Outfitter Experience Management platform. Mallard Bay gives hunting and fishing outfitters the tools to manage bookings, accept payments, market their services, and build their brand — a mobile booking app, custom websites, marketplace listings, and marketing services.",
    website: { href: "https://mallardbay.com", label: "mallardbay.com" },
    image: {
      src: "/investments/mallardbay.png",
      width: 1200,
      height: 131,
      treatment: "logo",
    },
  },
];
