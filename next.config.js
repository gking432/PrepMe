/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow file uploads up to 10MB
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig

