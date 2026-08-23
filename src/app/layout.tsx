import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
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
  );
}
