import { i18n } from "@/lib/i18n";

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: i18n.public.brand.wordmark,
    short_name: i18n.public.brand.wordmark,
    description: i18n.public.brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F0E7",
    theme_color: "#000000",
    icons: [
      {
        src: "/brand/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
