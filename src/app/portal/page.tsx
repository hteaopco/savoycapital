import { redirect } from "next/navigation";

/**
 * Home — a redirect to Portfolio, on purpose and temporarily.
 *
 * > "point the 'home' button here https://savoycapital.io/portal/portfolio for
 * > right now until we build out the site" — owner, 2026-08-24
 *
 * **The nav's Home link moved to `/home` on 2026-08-24** (owner). This redirect
 * stays anyway, for the other reason it existed: `signInFallbackRedirectUrl` in
 * `src/app/layout.tsx` lands here after sign-in, that prop is the Clerk seat's,
 * and a user who has just signed in should arrive at a real screen rather than
 * at `/home`, which is still a coming-soon placeholder.
 *
 * So `/portal` is now reachable only by sign-in and by an old link — no nav entry
 * points here. That also keeps the active check honest: two nav entries pointing
 * at the same href would both match `pathname === href` and light up together.
 *
 * **Authenticated.** `src/proxy.ts` requires a session for every route not on
 * its short public list, so protection comes from this path being ABSENT from
 * that list. Do not add it there.
 *
 * To restore Home: delete the redirect and put a page back. The shell that was
 * here rendered `<PortalShell title="Home">` around a dashed empty-state card.
 */
export default function PortalHome() {
  redirect("/portal/portfolio");
}
