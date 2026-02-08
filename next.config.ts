import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  devIndicators:false,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
