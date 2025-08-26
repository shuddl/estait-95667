
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure trailing slashes match Firebase hosting config
  trailingSlash: false,
  // Enable strict mode for better error detection
  reactStrictMode: true,
  // TypeScript and ESLint settings
  typescript: {
    // Don't fail build on TS errors (for MVP - remove for production)
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't fail build on ESLint errors (for MVP - remove for production)
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
