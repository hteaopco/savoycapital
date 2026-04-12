import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savoy Capital Fund",
  description: "Backing Exceptional SaaS Founders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
