/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true'
const basePath = isProd ? '/controle-orcamentos' : ''

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath,
}

module.exports = nextConfig
