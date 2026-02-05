/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true'
const isExport = process.env.EXPORT_MODE === 'true' // Para GitHub Pages, use EXPORT_MODE=true npm run build
const basePath = isProd && isExport ? '/controle-orcamentos' : ''

const nextConfig = {
  // Só usa export quando explicitamente solicitado (GitHub Pages)
  // Em produção normal ou dev, precisa de server para API routes
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
  images: {
    unoptimized: true,
  },
  basePath: isExport ? basePath : '',
  assetPrefix: isExport ? basePath : '',
}

module.exports = nextConfig
