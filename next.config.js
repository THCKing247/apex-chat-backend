/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude the old React app and server directories from the build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Ignore patterns for webpack
  webpack: (config, { isServer }) => {
    // Exclude client and server directories
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/client/**', '**/server/**', '**/node_modules/**'],
    }
    return config
  },
}

module.exports = nextConfig

