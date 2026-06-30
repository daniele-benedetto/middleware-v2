import createBundleAnalyzer from "@next/bundle-analyzer";

import type { NextConfig } from "next";

function parseSourceList(value: string | undefined) {
  return (
    value
      ?.split(/\s+/)
      .map((source) => source.trim())
      .filter(Boolean) ?? []
  );
}

const mediaSources = ["'self'", "blob:", ...parseSourceList(process.env.CSP_MEDIA_SRC)];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `media-src ${mediaSources.join(" ")}`,
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const privateNoStoreHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
    viewTransition: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/api/public/media/blob",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/cms/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/trpc/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/cms/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/auth/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/telemetry",
        headers: privateNoStoreHeaders,
      },
    ];
  },
};

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
