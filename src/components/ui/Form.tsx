'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, type, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className={cn('label', required && 'label-required')}>
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'input',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  required?: boolean
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, required, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className={cn('label', required && 'label-required')}>
            {label}
          </label>
        )}
        <select
          className={cn(
            'select',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Select com children (permite usar <option> diretamente)
interface SelectChildrenProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export const SelectChildren = forwardRef<HTMLSelectElement, SelectChildrenProps>(
  ({ className, label, error, required, children, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className={cn('label', required && 'label-required')}>
            {label}
          </label>
        )}
        <select
          className={cn(
            'select',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

SelectChildren.displayName = 'SelectChildren'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, required, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className={cn('label', required && 'label-required')}>
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'input min-h-[80px] resize-y',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          className={cn('checkbox', className)}
          ref={ref}
          {...props}
        />
        {label && (
          <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
