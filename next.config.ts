import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  images: {
    localPatterns: [
      {
        pathname: "/api/public/media/blob",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "**.private.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
