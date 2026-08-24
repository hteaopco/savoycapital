import { redirect } from "next/navigation";

/**
 * Home — a redirect to Portfolio, on purpose and temporarily.
 *
 * > "point the 'home' button here https://savoycapital.io/portal/portfolio for
 * > right now until we build out the site" — owner, 2026-08-24
 *
 * The sidebar's Home link still points at `/portal`, and `signInFallbackRedirectUrl`
 * in `src/app/layout.tsx` still lands here after sign-in. Redirecting from the
 * route rather than repointing the link is what keeps both of those honest: the
 * nav stays semantic, sign-in cannot land on a dead page, and there is exactly
 * one line to delete when Home gets built.
 *
 * It also avoids the alternative's bug — two nav entries pointing at the same
 * href would both match the active check and light up together.
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
