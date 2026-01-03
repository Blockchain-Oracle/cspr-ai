'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/utils';

export interface LoadingSpinnerProps {
  variant?: 'spinner' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  variant = 'spinner',
  size = 'md',
  theme,
  text,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2.5 w-2.5",
    lg: "h-4 w-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center text-muted-foreground", className)}>
      {variant === 'spinner' && (
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      )}
      
      {variant === 'dots' && (
        <div className="flex items-center gap-1.5">
          <div className={cn("bg-primary rounded-full animate-bounce [animation-delay:-0.3s]", dotSizes[size])} />
          <div className={cn("bg-primary rounded-full animate-bounce [animation-delay:-0.15s]", dotSizes[size])} />
          <div className={cn("bg-primary rounded-full animate-bounce", dotSizes[size])} />
        </div>
      )}

      {variant === 'pulse' && (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2/3 w-2/3 bg-primary"></span>
        </div>
      )}
      
      {text && (
        <p className={cn("mt-3 animate-pulse font-medium text-sm text-center", size === 'lg' ? "text-base" : "")}>
          {text}
        </p>
      )}
    </div>
  );
}