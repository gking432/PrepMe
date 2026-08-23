/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  // pdf-parse uses pdfjs-dist which has module resolution issues in serverless
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Allow file uploads up to 10MB
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
