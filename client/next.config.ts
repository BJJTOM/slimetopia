import type { NextConfig } from "next";

// Static export: Capacitor builds OR Cloudflare Pages (when API URL is configured externally)
const isStaticExport =
  process.env.CAPACITOR_BUILD === "true" ||
  process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  // Static export for Capacitor (Android/iOS) and Cloudflare Pages
  ...(isStaticExport && {
    output: "export",
    trailingSlash: true,
  }),

  images: {
    unoptimized: true,
  },

  // Proxy API requests to Go backend during local web development only
  ...(!isStaticExport && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:8080/api/:path*",
        },
        {
          source: "/ws/:path*",
          destination: "http://localhost:8080/ws/:path*",
        },
        {
          source: "/uploads/:path*",
          destination: "http://localhost:8080/uploads/:path*",
        },
      ];
    },
  }),
};

export default nextConfig;
