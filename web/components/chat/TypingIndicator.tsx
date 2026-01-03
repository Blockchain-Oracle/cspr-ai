'use client';

import * as React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/components/utils';

export interface TypingIndicatorProps {
  message?: string;
}

export function TypingIndicator({ message }: TypingIndicatorProps) {
  return (
    <div className="flex w-full items-start gap-3 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-[80%]">
         <span className="text-xs text-muted-foreground ml-1">CSPR.AI</span>
         <div className="rounded-2xl rounded-tl-none bg-muted px-5 py-4 text-sm shadow-sm flex items-center gap-1.5 min-w-[60px]">
             {message ? (
                 <span className="text-muted-foreground animate-pulse">{message}</span>
             ) : (
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" />
                </div>
             )}
         </div>
      </div>
    </div>
  );
}