'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ThemeToggle({
  theme,
  onToggle,
  size = 'md',
  className
}: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn("rounded-full relative", className)}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun 
        className={cn(
          "h-5 w-5 transition-all duration-300 ease-in-out absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          theme === 'dark' ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} 
      />
      <Moon 
        className={cn(
          "h-5 w-5 transition-all duration-300 ease-in-out absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          theme === 'dark' ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )} 
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}