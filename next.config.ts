import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Example: disable ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.SUPABASE_URL?.replace('https://', '') || 'localhost',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Add your other Next.js config options here
}

export default nextConfig
