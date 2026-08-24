import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * The public surface, listed exhaustively. Everything not named here requires
 * a signed-in user.
 *
 * The list is an ALLOWLIST on purpose. The obvious alternative — naming the
 * private routes and leaving the rest open — fails in the dangerous direction:
 * a new page under the portfolio monitor would ship public until someone
 * remembered to add it. This way the mistake is a marketing page that asks for
 * a login, which is embarrassing and instantly visible, rather than fund
 * positions served to the internet, which is neither.
 *
 * The cost, stated plainly: an unknown URL redirects a signed-out visitor to
 * the login instead of 404ing. Adding a public page means adding it here.
 *
 * `/sign-in(.*)` must stay public or the sign-in page redirects to itself.
 * `/api/health` must stay public or Railway's healthcheck fails the deploy.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/coming-soon",
  "/sign-in(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  // Point the redirect at OUR sign-in page explicitly. Without this Clerk
  // sends a signed-out visitor to its hosted Account Portal on a
  // *.accounts.dev domain — verified, not assumed — which is off-brand, off
  // -domain, and quietly makes src/app/sign-in/ dead code. The alternative fix
  // is the NEXT_PUBLIC_CLERK_SIGN_IN_URL env var; doing it here instead means
  // a missing deploy variable cannot silently restore that behaviour.
  const signInUrl = new URL("/sign-in", request.url);

  // A RELATIVE return path, deliberately.
  //
  // Behind Railway the container is addressed internally, so `request.url` is
  // `https://localhost:8080/...`, not the public URL. Passing it here shipped
  // `redirect_url=https%3A%2F%2Flocalhost%3A8080%2Fportfolio` to production:
  // the redirect itself was fine — Next rewrites the host of the Location
  // header from the forwarded headers — but the query string is opaque to
  // that, so a user who signed in successfully was sent to a dead address.
  // Observed in production, not theorised.
  //
  // A relative path sidesteps the whole problem: nothing has to reconstruct
  // the public origin, so nothing can get it wrong. It also avoids trusting
  // `X-Forwarded-Host` — the other fix — which is attacker-controlled unless
  // the proxy is known to overwrite it, and feeding that into a redirect is
  // how open redirects are built.
  signInUrl.searchParams.set(
    "redirect_url",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  // Authentication only. There is no authorization layer behind this: the
  // Clerk instance is set to restricted sign-up, so an account cannot come
  // into existence unless a principal made it and "signed in" is the whole
  // test. Accounts are created in the Dashboard rather than invited (owner,
  // 2026-08-24); that does not change this, because what `restricted` blocks
  // is a stranger creating one. See .claudet/PLAYBOOKS/auth-clerk.md § 1.
  await auth.protect(undefined, { unauthenticatedUrl: signInUrl.toString() });
});

export const config = {
  matcher: [
    // Skip Next internals and static files, but always run for API routes.
    // Clerk's recommended matcher, carried as-is.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
