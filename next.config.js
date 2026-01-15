/** @type {import('next').NextConfig} */
const basePath = process.env.NODE_ENV === 'production' ? '/controle-orcamentos' : ''

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
