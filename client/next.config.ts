import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  // Static export for Capacitor (Android/iOS) builds
  ...(isCapacitorBuild && {
    output: "export",
    trailingSlash: true,
  }),

  images: {
    unoptimized: true,
  },

  // Proxy API requests to Go backend during web development only
  ...(!isCapacitorBuild && {
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
