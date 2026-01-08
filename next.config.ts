import type { NextConfig } from "next";

// Load environment variables from shared docker/.env or local .env
import "./lib/env-loader";

const nextConfig: NextConfig = {
  // ⚠️ FIXME: PPR requires Next.js canary. Re-enable after upgrading from 15.5.9 stable
  // experimental: {
  //   ppr: true,
  // },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
};

export default nextConfig;
