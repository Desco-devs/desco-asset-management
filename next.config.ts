import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Example: disable ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Add your other Next.js config options here
}

export default nextConfig
