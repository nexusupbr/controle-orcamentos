'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Usuario, loginUsuario } from '@/lib/supabase'

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  login: (email: string, senha: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  authEnabled: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper seguro para localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage não disponível:', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage não disponível:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage não disponível:', e);
    }
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [authEnabled, setAuthEnabled] = useState(false)

  useEffect(() => {
    // Verifica se há usuário salvo no localStorage
    const savedUser = safeLocalStorage.getItem('usuario')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUsuario(parsed)
        setAuthEnabled(true)
      } catch {
        safeLocalStorage.removeItem('usuario')
      }
    }
    // Finaliza loading imediatamente - sem esperar banco
    setLoading(false)
  }, [])

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      const user = await loginUsuario(email, senha)
      if (user) {
        setUsuario(user)
        setAuthEnabled(true)
        safeLocalStorage.setItem('usuario', JSON.stringify(user))
        return true
      }
      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }

  const logout = () => {
    setUsuario(null)
    setAuthEnabled(false)
    safeLocalStorage.removeItem('usuario')
  }

  const isAdmin = !authEnabled || usuario?.tipo === 'admin'

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, isAdmin, authEnabled }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
