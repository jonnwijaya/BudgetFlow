import type {NextConfig} from 'next';

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true, // Auto-registers the service worker
  skipWaiting: true, // Forces the waiting service worker to become the active service worker
  disable: process.env.NODE_ENV === "development", // Disable PWA in development mode
  // You can add more PWA options here, like custom caching strategies
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
