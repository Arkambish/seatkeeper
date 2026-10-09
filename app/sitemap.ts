import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/brand";
import { getPublicCatalogue } from "@/lib/services/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { workshops } = await getPublicCatalogue();
  return [
    { url: `${APP_URL}/`, changeFrequency: "daily", priority: 1 },
    ...workshops.map((w) => ({
      url: `${APP_URL}/classes/${w.id}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
