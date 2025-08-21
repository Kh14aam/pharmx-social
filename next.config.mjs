/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration for better Cloudflare compatibility
  output: 'standalone',
  
  // Disable image optimization (Cloudflare handles this)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },

  // Experimental features for edge runtime
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL || '',
  },

  // Disable SWC minification if there are issues
  swcMinify: true,

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Exclude worker directory from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
