import type { NextConfig } from "next";

const NIRVA_API_URL = process.env.NIRVA_API_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Optional live bridge to the Nirva AI Core backend (NLE/NMD).
  // The prototype stays fully functional on mock data when it's offline.
  async rewrites() {
    return [{ source: "/nirva-api/:path*", destination: `${NIRVA_API_URL}/api/:path*` }];
  },
};

export default nextConfig;
