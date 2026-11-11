import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages only. Signed-in routes are not listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/the-steps", "/how-it-helps", "/who-its-for"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
