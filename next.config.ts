import type { NextConfig } from "next";

// Load environment variables from shared docker/.env or local .env
import "./lib/env-loader";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default nextConfig;
