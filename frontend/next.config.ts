import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable modern features for Next.js 15
  experimental: {
    // Remove deprecated appDir option - it's default in Next.js 15
  },
};

export default nextConfig;
