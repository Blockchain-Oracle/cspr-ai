'use client';

import * as React from 'react';
import { cn } from '@/components/utils';

export interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
}

export function Logo({
  variant = 'full',
  size = 'md',
  theme,
  className,
  onClick,
}: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };
  
  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  const Icon = () => (
    <svg 
      width={iconSizes[size]} 
      height={iconSizes[size]} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary shrink-0"
    >
      <path 
        d="M16 2L4 9V23L16 30L28 23V9L16 2Z" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <text x="16" y="18" fontFamily="ui-monospace, monospace" fontWeight="800" fontSize="10" fill="currentColor" textAnchor="middle">AI</text>
      <path 
        d="M16 2V9" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
      <path 
        d="M16 23V30" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div 
      className={cn(
        "flex items-center gap-2 font-bold tracking-tight select-none transition-opacity hover:opacity-90", 
        sizeClasses[size], 
        className,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {(variant === 'full' || variant === 'icon') && <Icon />}
      {(variant === 'full' || variant === 'text') && (
        <span className={cn("font-mono", variant === 'full' ? "hidden sm:inline-block" : "inline-block")}>
          CSPR<span className="text-primary">.AI</span>
        </span>
      )}
    </div>
  );
}