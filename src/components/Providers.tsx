'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </AdminAuthProvider>
    </AuthProvider>
  )
}
