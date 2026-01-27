import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

const basePath = process.env.NODE_ENV === 'production' ? '/controle-orcamentos' : ''

export const metadata: Metadata = {
  title: 'Controle de Orçamentos | Sistema Profissional',
  description: 'Sistema profissional para controle e gerenciamento de orçamentos comerciais',
  icons: {
    icon: `${basePath}/favicon.ico`,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
