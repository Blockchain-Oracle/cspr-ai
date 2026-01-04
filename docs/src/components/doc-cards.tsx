'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface DocCardProps {
  title: string
  description?: string
  href: string
  icon?: React.ReactNode
}

export function DocCard({ title, description, href, icon }: DocCardProps) {
  return (
    <Link href={href} className="group no-underline">
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 cursor-pointer">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="text-primary">{icon}</div>
              )}
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          {description && (
            <CardDescription className="mt-2 text-sm">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    </Link>
  )
}

interface DocCardsProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

export function DocCards({ children, cols = 2, className }: DocCardsProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4 mt-6 not-prose', gridCols[cols], className)}>
      {children}
    </div>
  )
}
