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
};

module.exports = nextConfig;
