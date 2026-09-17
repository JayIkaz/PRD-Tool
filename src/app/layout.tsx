import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Discovery & Definition Tool",
  description: "Turn a vague idea into a defined, traceable product requirement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
