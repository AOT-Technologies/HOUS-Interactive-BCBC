/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  eslint: {
    dirs: ['app', 'components', 'lib', 'hooks'],
  },
};

module.exports = nextConfig;
