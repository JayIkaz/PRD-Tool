import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Fonts committed to the repo (SIL OFL, latin subset) and loaded with
// next/font/local: no runtime request to a font CDN, and the build does not
// depend on reaching Google Fonts. Hanken Grotesk = body (variable weight),
// Instrument Serif = headings (one weight, regular), IBM Plex Mono = codes
// (REQ-001 etc). Instrument Serif has no bold, so globals.css turns off
// synthesised weight rather than letting the browser fake one.
const body = localFont({
  src: "./fonts/hanken-grotesk-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});
const heading = localFont({
  src: "./fonts/instrument-serif-latin-400-normal.woff2",
  variable: "--font-heading",
  weight: "400",
  style: "normal",
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
