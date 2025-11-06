import React from 'react'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FlagButtonProps = {
  dataPath: string
  dataType: string
  hasFlags?: boolean
  flagCount?: number
  onClick: () => void
  size?: 'sm' | 'default'
  className?: string
}

export const FlagButton: React.FC<FlagButtonProps> = ({
  hasFlags,
  flagCount,
  onClick,
  size = 'default',
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors',
        'bg-transparent',
        size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
        className
      )}
      aria-label="Flag for review"
    >
      <Flag
        className={cn(
          'h-4 w-4',
          hasFlags ? 'text-red-600' : 'text-gray-400'
        )}
        aria-hidden
      />
      {hasFlags && flagCount !== undefined && flagCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
          {flagCount}
        </span>
      )}
    </button>
  )
}
