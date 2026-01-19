'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Helper seguro para localStorage (evita erros de extensões do navegador)
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

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Verifica se está autenticado ao carregar
    try {
      const auth = safeLocalStorage.getItem('adminAuth');
      const savedEmail = safeLocalStorage.getItem('adminEmail');
      
      if (auth === 'true') {
        setIsAuthenticated(true);
        setEmail(savedEmail);
      }
    } catch (e) {
      console.warn('Erro ao verificar autenticação:', e);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    // Protege as rotas admin (exceto login)
    if (!loading) {
      const isAdminRoute = pathname?.startsWith('/admin');
      const isLoginPage = pathname === '/admin/login';

      if (isAdminRoute && !isLoginPage && !isAuthenticated) {
        router.push('/admin/login');
      }
    }
  }, [pathname, isAuthenticated, loading, router]);

  const login = (userEmail: string) => {
    safeLocalStorage.setItem('adminAuth', 'true');
    safeLocalStorage.setItem('adminEmail', userEmail);
    setIsAuthenticated(true);
    setEmail(userEmail);
  };

  const logout = () => {
    safeLocalStorage.removeItem('adminAuth');
    safeLocalStorage.removeItem('adminEmail');
    setIsAuthenticated(false);
    setEmail(null);
    router.push('/');
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, email, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
