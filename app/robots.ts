import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/brand";

/** Public pages are indexable; the staff app and API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/classes/"],
      disallow: ["/login", "/workshops", "/locations", "/users", "/activity", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
