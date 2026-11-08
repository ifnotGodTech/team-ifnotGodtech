import type { MetadataRoute } from "next";

// An internal tool: nothing here should ever be crawled.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
