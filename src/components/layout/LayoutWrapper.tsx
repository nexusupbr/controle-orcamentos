'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { LoadingSpinner } from '@/components/ui/Common'

// Rotas que não precisam de layout (login)
const noLayoutRoutes = ['/login', '/admin/login']

// Rotas que precisam de autenticação administrativa
const adminRoutes = ['/admin', '/orcamentos', '/obras', '/materiais', '/resumo', '/configuracoes']

// Base path para produção (GitHub Pages)
const basePath = process.env.NODE_ENV === 'production' ? '/controle-orcamentos' : ''

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const { isAuthenticated: isAdminAuthenticated, loading: adminLoading } = useAdminAuth()
  const [isClient, setIsClient] = useState(false)

  // Marca quando está no cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Normaliza o pathname removendo barra final e basePath
  let normalizedPathname = pathname || ''
  if (normalizedPathname.startsWith(basePath)) {
    normalizedPathname = normalizedPathname.slice(basePath.length)
  }
  if (normalizedPathname.endsWith('/') && normalizedPathname.length > 1) {
    normalizedPathname = normalizedPathname.slice(0, -1)
  }
  if (!normalizedPathname) {
    normalizedPathname = '/'
  }
  
  const isNoLayoutRoute = noLayoutRoutes.includes(normalizedPathname)
  const isAdminRoute = adminRoutes.some(route => normalizedPathname === route || normalizedPathname.startsWith(route + '/'))

  // Rota de login - renderiza imediatamente sem esperar loading
  if (isNoLayoutRoute) {
    return <>{children}</>
  }

  // Proteção das rotas administrativas - redireciona se não autenticado
  useEffect(() => {
    if (isClient && !authLoading && !adminLoading && isAdminRoute && !isAdminAuthenticated) {
      router.push('/admin/login')
    }
  }, [isClient, pathname, isAdminAuthenticated, authLoading, adminLoading, isAdminRoute, router])

  // Loading inicial (apenas para rotas que não são de login)
  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Bloqueia acesso às rotas admin se não autenticado
  if (isAdminRoute && !isAdminAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Layout normal
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Header />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
