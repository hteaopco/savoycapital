import { redirect } from "next/navigation";

/**
 * Home — a redirect to Portfolio, on purpose and temporarily.
 *
 * > "point the 'home' button here https://savoycapital.io/portal/portfolio for
 * > right now until we build out the site" — owner, 2026-08-24
 *
 * **This redirect is now the only thing standing between sign-in and a real
 * screen.** `signInFallbackRedirectUrl` in `src/app/layout.tsx` lands here after
 * sign-in; that prop belongs to the Clerk seat, so the redirect lives on this
 * side. Home and Historical were deleted on 2026-08-24 (owner), leaving
 * Portfolio as the only portal screen — which makes this the right target
 * rather than merely a convenient one.
 *
 * `/portal` is reachable only by sign-in and by an old link; no nav entry points
 * here. That also keeps the active check honest: two nav entries on the same
 * href would both match `pathname === href` and light up together.
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
