import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Default port for this app (avoids conflict with other local projects)
  // Run with: npm run dev -- -p 3001
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
};

export default nextConfig;
