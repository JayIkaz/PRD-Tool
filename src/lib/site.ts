import type { Metadata } from "next";

/**
 * Names and URLs used by the public pages. The product name is going to
 * change: edit SITE_NAME here and the page titles, share previews and header
 * wording follow. (The landing page's own copy and the app shell still say
 * "Product Discovery" in places; search for it when the new name lands.)
 */
export const SITE_NAME = "Product Discovery";
export const SITE_URL = "https://bpmngenie.com";

/** Title, description, canonical URL and share preview for one public page. */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, type: "website" },
  };
}
