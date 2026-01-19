import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'

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
        <AuthProvider>
          <AdminAuthProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AdminAuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
