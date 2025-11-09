/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
  },
      {
        protocol: 'https',
        hostname: '*.pinata.cloud',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore mediapipe and other problematic packages
    config.externals = config.externals || {}
    if (!isServer) {
      config.externals.push({
        '@mediapipe/tasks-vision': '@mediapipe/tasks-vision',
        '@tensorflow/tfjs': '@tensorflow/tfjs',
      })
    }
    
    // Handle .node files
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    
    return config
  },
}

module.exports = nextConfig

