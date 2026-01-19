'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
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

  // Normaliza o pathname removendo barra final e basePath
  const normalizedPathname = useMemo(() => {
    let normalized = pathname || ''
    if (normalized.startsWith(basePath)) {
      normalized = normalized.slice(basePath.length)
    }
    if (normalized.endsWith('/') && normalized.length > 1) {
      normalized = normalized.slice(0, -1)
    }
    return normalized || '/'
  }, [pathname])
  
  const isNoLayoutRoute = noLayoutRoutes.includes(normalizedPathname)
  const isAdminRoute = adminRoutes.some(route => normalizedPathname === route || normalizedPathname.startsWith(route + '/'))

  // Marca quando está no cliente - DEVE vir antes de qualquer return
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Proteção das rotas administrativas - redireciona se não autenticado
  // DEVE vir antes de qualquer return
  useEffect(() => {
    if (isClient && !authLoading && !adminLoading && isAdminRoute && !isAdminAuthenticated) {
      router.push('/admin/login')
    }
  }, [isClient, isAdminAuthenticated, authLoading, adminLoading, isAdminRoute, router])

  // Agora sim podemos ter returns condicionais

  // Rota de login - renderiza imediatamente sem layout
  if (isNoLayoutRoute) {
    return <>{children}</>
  }

  // Loading inicial (apenas para rotas que não são de login)
  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Bloqueia acesso às rotas admin se não autenticado (mostra loading enquanto redireciona)
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