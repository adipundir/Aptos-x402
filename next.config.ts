import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Increase timeout for external API calls during build
  experimental: {
    // @ts-ignore
    proxyTimeout: 300_000, // 5 minutes
  },
  // Externalize Aptos SDK to avoid keyv dynamic import issues
  serverExternalPackages: ['@aptos-labs/ts-sdk', 'aptos'],
  // Disable static optimization for pages that might make network calls
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Fix for Aptos SDK keyv dynamic imports
  webpack: (config, { isServer }) => {
    // Handle keyv adapter dynamic imports - set all to false to ignore
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@keyv/redis': false,
        '@keyv/mongo': false,
        '@keyv/sqlite': false,
        '@keyv/postgres': false,
        '@keyv/mysql': false,
        '@keyv/etcd': false,
        '@keyv/offline': false,
        '@keyv/tiered': false,
        'keyv': false,
      };
    }
    
    // Externalize keyv packages on server side
    if (isServer) {
      config.externals = [...(config.externals || []), 
        '@keyv/redis',
        '@keyv/mongo', 
        '@keyv/sqlite',
        '@keyv/postgres',
        '@keyv/mysql',
        '@keyv/etcd',
        '@keyv/offline',
        '@keyv/tiered',
        /^keyv/,
      ];
    }
    
    return config;
  },
};

export default nextConfig;
