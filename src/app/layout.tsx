import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { C } from "@/components/palette";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Savoy Capital",
  description:
    "Savoy Capital is a private investment fund making private equity and private debt investments.",
};

/**
 * Clerk's components are the one part of this app whose markup we do not own,
 * so the palette reaches them through Clerk's appearance variables instead of
 * inline styles. Every value below is a `C` token — no raw hex, per
 * design/AP_DESIGN_REFERENCE.md § 2 — which is what keeps the sign-in screen
 * from reading as a third-party form dropped into the site.
 *
 * Radius 8 and the Inter stack come from the same reference: 8 is the scale's
 * button/input step, and the font matches the `--font-sans` the body already
 * sets.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: C.accent,
    colorPrimaryForeground: C.onSolid,
    colorBackground: C.bg,
    colorForeground: C.text,
    colorMuted: C.bgAlt,
    colorMutedForeground: C.textMuted,
    colorBorder: C.border,
    colorRing: C.accentBorder,
    colorInput: C.bg,
    colorInputForeground: C.text,
    colorDanger: C.red,
    colorSuccess: C.green,
    colorWarning: C.amber,
    borderRadius: "8px",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // No `signUpUrl` and no sign-up route: the authenticated population is two
    // named people, provisioned by invitation from the Clerk Dashboard. See
    // .claudet/PLAYBOOKS/auth-clerk.md before adding one.
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/monitor"
      afterSignOutUrl="/"
    >
      <html lang="en" className={inter.variable}>
        <body
          style={{
            margin: 0,
            background: C.bg,
            color: C.text,
            fontFamily: "var(--font-sans), system-ui, sans-serif",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
