'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/components/utils';

const cardVariants = cva(
  "rounded-xl border shadow-sm transition-all overflow-hidden flex flex-col",
  {
    variants: {
      variant: {
        default: "bg-card border-border text-card-foreground",
        elevated: "bg-card shadow-md border-transparent text-card-foreground",
        bordered: "bg-transparent border-border shadow-none text-foreground",
        glass: "glass dark:glass-dark border-white/20 text-foreground",
      },
      isClickable: {
        true: "cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.99]",
      },
    },
    defaultVariants: {
      variant: "default",
      isClickable: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof cardVariants>, 'isClickable'> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isClickable?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  theme?: 'light' | 'dark';
}

export function Card({
  children,
  variant,
  padding = 'md',
  isClickable,
  header,
  footer,
  theme,
  className,
  ...props
}: CardProps) {
  const paddingClass = 
    padding === 'none' ? '' : 
    padding === 'sm' ? 'p-4' : 
    padding === 'lg' ? 'p-8' : 
    'p-6';

  return (
    <div
      className={cn(cardVariants({ variant, isClickable, className }))}
      {...props}
    >
      {header && (
        <div className={cn("border-b border-border/50", paddingClass)}>
          {header}
        </div>
      )}
      <div className={cn("flex-1", paddingClass)}>
        {children}
      </div>
      {footer && (
        <div className={cn("border-t border-border/50 bg-muted/30", paddingClass)}>
          {footer}
        </div>
      )}
    </div>
  );
}