import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Increase timeout for external API calls during build
  experimental: {
    // @ts-ignore
    proxyTimeout: 300_000, // 5 minutes
  },
  // Disable static optimization for pages that might make network calls
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

export default nextConfig;
