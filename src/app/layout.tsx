import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

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
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col lg:ml-64">
            <Header />
            <main className="flex-1 p-4 lg:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
