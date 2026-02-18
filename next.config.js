/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow file uploads up to 10MB
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // pdf-parse uses pdfjs-dist which has module resolution issues in serverless
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
}

module.exports = nextConfig

