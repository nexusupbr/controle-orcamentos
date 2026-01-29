'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  HardHat,
  Shield,
  ArrowLeft,
  ShoppingCart,
  Users,
  Wallet,
  DollarSign,
  PieChart,
  Receipt,
  FileCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Calculator,
  FolderOpen,
  Cog,
  Tags,
  LucideIcon
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn, getAssetPath } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

// Tipo para item de navegação
interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

// Tipo para grupo de navegação (com submenu)
interface NavGroup {
  name: string
  icon: LucideIcon
  items: NavItem[]
}

// Navegação reorganizada com submenus
const adminNavigationGroups: NavGroup[] = [
  {
    name: 'Operação',
    icon: Briefcase,
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Orçamentos', href: '/orcamentos', icon: FileText },
      { name: 'Materiais', href: '/materiais', icon: Package },
      { name: 'Obras', href: '/obras', icon: HardHat },
    ]
  },
  {
    name: 'Comercial',
    icon: Receipt,
    items: [
      { name: 'Vendas', href: '/vendas', icon: Receipt },
      { name: 'OS (Detalhado)', href: '/os', icon: ClipboardList },
    ]
  },
  {
    name: 'Financeiro',
    icon: Wallet,
    items: [
      { name: 'Financeiro', href: '/financeiro', icon: Wallet },
      { name: 'Caixa', href: '/caixa', icon: DollarSign },
    ]
  },
  {
    name: 'Cadastros',
    icon: FolderOpen,
    items: [
      { name: 'Clientes/Fornecedores', href: '/clientes', icon: Users },
      { name: 'Estoque', href: '/estoque', icon: Package },
      { name: 'Categorias Financeiras', href: '/categorias-financeiras', icon: Tags },
    ]
  },
  {
    name: 'Fiscal',
    icon: FileCheck,
    items: [
      { name: 'Notas Fiscais', href: '/notas-fiscais', icon: FileCheck },
      { name: 'Compras (XML)', href: '/compras', icon: ShoppingCart },
    ]
  },
  {
    name: 'Relatórios',
    icon: PieChart,
    items: [
      { name: 'Relatórios', href: '/relatorios', icon: PieChart },
      { name: 'Resumo', href: '/resumo', icon: BarChart3 },
    ]
  },
  {
    name: 'Configurações',
    icon: Cog,
    items: [
      { name: 'Geral', href: '/configuracoes', icon: Settings },
      { name: 'Fiscal', href: '/configuracoes/fiscal', icon: Calculator },
    ]
  },
]

// Navegação simples (padrão para todos)
const simpleNavigation: NavItem[] = [
  { name: 'Obras', href: '/', icon: HardHat },
]

// Rotas administrativas
const adminRoutes = ['/admin', '/orcamentos', '/os', '/materiais', '/resumo', '/configuracoes', '/obras', '/estoque', '/compras', '/clientes', '/financeiro', '/caixa', '/relatorios', '/vendas', '/notas-fiscais', '/categorias-financeiras']

// Componente de grupo de navegação com submenu
function NavGroupComponent({ 
  group, 
  isOpen, 
  onToggle, 
  pathname,
  onMobileClose
}: { 
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  pathname: string
  onMobileClose: () => void
}) {
  // Verifica se algum item do grupo está ativo
  const hasActiveItem = group.items.some(item => 
    pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <div className="mb-1">
      {/* Cabeçalho do grupo (clicável para expandir/colapsar) */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          hasActiveItem
            ? "bg-primary-500/10 text-primary-400"
            : "text-dark-400 hover:text-white hover:bg-dark-800/50"
        )}
      >
        <div className="flex items-center gap-3">
          <group.icon className={cn(
            "w-5 h-5",
            hasActiveItem ? "text-primary-400" : "text-dark-500"
          )} />
          <span>{group.name}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-dark-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-dark-500" />
        )}
      </button>

      {/* Itens do submenu */}
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="pl-4 space-y-0.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 group",
                  isActive 
                    ? "bg-primary-500/20 text-primary-400 border-l-2 border-primary-400" 
                    : "text-dark-400 hover:text-white hover:bg-dark-800/60 border-l-2 border-transparent"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary-400" : "text-dark-500 group-hover:text-primary-400"
                )} />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, logout, authEnabled } = useAuth()
  const { isAuthenticated: isAdminAuthenticated, logout: adminLogout, email: adminEmail } = useAdminAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Estado para controlar quais grupos estão abertos (usando array para compatibilidade)
  const [openGroups, setOpenGroups] = useState<string[]>([])

  // Verifica se está na área administrativa
  const isInAdminArea = adminRoutes.some(route => pathname.startsWith(route) && route !== '/')
  
  // Auto-expandir o grupo que contém a rota ativa
  useEffect(() => {
    if (isInAdminArea) {
      const activeGroup = adminNavigationGroups.find(group =>
        group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
      )
      if (activeGroup) {
        setOpenGroups(prev => {
          if (!prev.includes(activeGroup.name)) {
            return [...prev, activeGroup.name]
          }
          return prev
        })
      }
    }
  }, [pathname, isInAdminArea])

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => {
      if (prev.includes(groupName)) {
        return prev.filter(g => g !== groupName)
      } else {
        return [...prev, groupName]
      }
    })
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleAdminLogout = () => {
    adminLogout()
    router.push('/')
  }

  const goToAdmin = () => {
    if (isAdminAuthenticated) {
      router.push('/admin')
    } else {
      router.push('/admin/login')
    }
  }

  const goToObras = () => {
    router.push('/')
  }

  const closeMobile = () => setIsMobileOpen(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-dark-800 text-white"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen w-64 z-40 transition-transform duration-300 ease-in-out",
        "bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-r border-dark-800",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-dark-800">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-glow group-hover:shadow-glow-lg transition-shadow">
                  <Image
                    src={getAssetPath('/images/logo.jpeg')}
                    alt="Logo"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-400 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg text-white">Irriga</h1>
                <p className="text-xs text-primary-400 font-medium">Centro Oeste</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            {/* Voltar para Obras (se estiver na área admin) */}
            {isInAdminArea && (
              <button
                onClick={goToObras}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group text-dark-400 hover:text-white hover:bg-dark-800/80 mb-4"
              >
                <ArrowLeft className="w-5 h-5 text-dark-500 group-hover:text-primary-400" />
                <span>Voltar para Obras</span>
              </button>
            )}

            <p className="px-3 text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">
              {isInAdminArea ? 'Menu Administrativo' : 'Menu Principal'}
            </p>
            
            {isInAdminArea ? (
              // Navegação com submenus para área admin
              <div className="space-y-1">
                {adminNavigationGroups.map((group) => (
                  <NavGroupComponent
                    key={group.name}
                    group={group}
                    isOpen={openGroups.includes(group.name)}
                    onToggle={() => toggleGroup(group.name)}
                    pathname={pathname}
                    onMobileClose={closeMobile}
                  />
                ))}
              </div>
            ) : (
              // Navegação simples
              <div className="space-y-2">
                {simpleNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                        isActive 
                          ? "bg-gradient-to-r from-primary-500/20 to-primary-600/10 text-primary-400 border border-primary-500/30 shadow-glow" 
                          : "text-dark-400 hover:text-white hover:bg-dark-800/80"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-primary-400" : "text-dark-500 group-hover:text-primary-400"
                      )} />
                      <span>{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Botão Área Administrativa (somente quando não está na área admin) */}
            {!isInAdminArea && (
              <div className="pt-4 mt-4 border-t border-dark-800">
                <button
                  onClick={goToAdmin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-accent-500/10 to-accent-600/5 text-accent-400 border border-accent-500/20 hover:border-accent-500/40 hover:from-accent-500/20 hover:to-accent-600/10"
                >
                  <Shield className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  <span>Área Administrativa</span>
                </button>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-dark-800">
            {isInAdminArea && isAdminAuthenticated ? (
              <>
                <div className="glass rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Admin</p>
                      <p className="text-xs text-dark-400 truncate max-w-[140px]">{adminEmail}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleAdminLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair da Área Admin</span>
                </button>
              </>
            ) : (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Funcionário</p>
                    <p className="text-xs text-dark-400">Área de Obras</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
