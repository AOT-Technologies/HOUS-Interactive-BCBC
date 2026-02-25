/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Exclude FlexSearch from server-side bundling
  serverExternalPackages: ['flexsearch'],
  // Transpile monorepo packages
  transpilePackages: ['@repo/ui', '@repo/data', '@repo/constants'],
  // Environment variables
  env: {
    NEXT_PUBLIC_IMAGE_EXTENSION: process.env.NEXT_PUBLIC_IMAGE_EXTENSION || '.jpg',
  },
};

module.exports = nextConfig;
