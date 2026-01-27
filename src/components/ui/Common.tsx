'use client'

import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center mb-6">
        {icon || <Sparkles className="w-10 h-10 text-dark-500" />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-dark-400 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className={cn(
        "rounded-full border-dark-700 border-t-primary-500 animate-spin",
        sizes[size]
      )} />
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({ children, variant = 'success', size = 'md', className }: BadgeProps) {
  const variants = {
    success: 'badge-success',
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info',
    primary: 'badge-info',
    secondary: 'bg-dark-600 text-dark-300',
  }

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <span className={cn('badge', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
