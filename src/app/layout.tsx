import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Fonts committed to the repo (SIL OFL, latin subset) and loaded with
// next/font/local: no runtime request to a font CDN, and the build does not
// depend on reaching Google Fonts. Red Hat Text = body, Red Hat Display =
// headings (both variable weight, 300 to 900), IBM Plex Mono = codes
// (REQ-001 etc).
const body = localFont({
  src: "./fonts/red-hat-text-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "300 700",
  display: "swap",
});
const heading = localFont({
  src: "./fonts/red-hat-display-latin-wght-normal.woff2",
  variable: "--font-heading",
  weight: "300 900",
  display: "swap",
});
const code = localFont({
  src: "./fonts/ibm-plex-mono-latin-400-normal.woff2",
  variable: "--font-code",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Product Discovery & Definition Tool", template: `%s | ${SITE_NAME}` },
  description: "Turn a vague idea into a definition your team can review, challenge and approve before development starts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${body.variable} ${heading.variable} ${code.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
