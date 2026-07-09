import createBundleAnalyzer from "@next/bundle-analyzer";

import type { NextConfig } from "next";

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
  "media-src 'self' blob:",
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

const legacyV1Redirects = [
  {
    source: "/it",
    destination: "/",
    permanent: true,
  },
  {
    source: "/it/authors",
    destination: "/chi-siamo",
    permanent: true,
  },
  {
    source: "/it/categories",
    destination: "/contro-formazione",
    permanent: true,
  },
  {
    source: "/it/archive",
    destination: "/contro-formazione",
    permanent: true,
  },
  {
    source: "/it/podcasts",
    destination: "/contro-formazione",
    permanent: true,
  },
  {
    source: "/it/articles/conricerca-e-stile-della-militanza",
    destination:
      "/contro-formazione/operaismo-politico-italiano/conricerca-e-stile-della-militanza",
    permanent: true,
  },
  {
    source: "/it/articles/contesto-e-origini",
    destination: "/contro-formazione/operaismo-politico-italiano/contesto-e-origini",
    permanent: true,
  },
  {
    source: "/it/articles/genealogia-e-lessico",
    destination: "/contro-formazione/operaismo-politico-italiano/genealogia-e-lessico",
    permanent: true,
  },
  {
    source: "/it/podcast/conricerca-e-stile-della-militanza",
    destination:
      "/contro-formazione/operaismo-politico-italiano/conricerca-e-stile-della-militanza/ascolta",
    permanent: true,
  },
  {
    source: "/it/podcast/contesto-e-origini",
    destination: "/contro-formazione/operaismo-politico-italiano/contesto-e-origini/ascolta",
    permanent: true,
  },
  {
    source: "/it/podcast/genealogia-e-lessico",
    destination: "/contro-formazione/operaismo-politico-italiano/genealogia-e-lessico/ascolta",
    permanent: true,
  },
  {
    source: "/it/issues/operaismo-politico-italiano",
    destination: "/contro-formazione/operaismo-politico-italiano",
    permanent: true,
  },
  {
    source: "/it/about",
    destination: "/chi-siamo",
    permanent: true,
  },
  {
    source: "/it/cookie-policy",
    destination: "/cookie-policy",
    permanent: true,
  },
  {
    source: "/it/privacy-policy",
    destination: "/privacy-policy",
    permanent: true,
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
    proxyClientMaxBodySize: "100mb",
    viewTransition: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/brand/**",
      },
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
    ];
  },
  async redirects() {
    return legacyV1Redirects;
  },
};

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
