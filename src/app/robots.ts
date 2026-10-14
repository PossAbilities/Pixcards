import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/constants";

// Built per request so the live site URL (a runtime setting) is used.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api/",
        "/print/",
        "/c/",
        "/org/join/",
        "/checkout/",
        "/reset-password",
        "/unsubscribe",
      ],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
