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
  signInUrl.searchParams.set("redirect_url", request.url);

  // Authentication only — this establishes that SOMEBODY is signed in.
  // Whether that someone may see the monitor is decided server-side by
  // `checkAccess()` in src/lib/auth.ts, because the answer needs the user's
  // verified email addresses and middleware should not be fetching those on
  // every request.
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
