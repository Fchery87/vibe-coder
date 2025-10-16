import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: ["localhost"],
  },
  // Set workspace root to resolve lockfile warning
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Enable modern features for Next.js 15
  experimental: {
    // Remove deprecated appDir option - it's default in Next.js 15
  },
};

export default nextConfig;
