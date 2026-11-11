import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Keeps crawlers out of the signed-in app. This is housekeeping, not security:
// those routes are protected by sign-in and row-level security.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/product-definitions", "/auth"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
