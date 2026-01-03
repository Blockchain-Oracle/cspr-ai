'use client';

import * as React from 'react';
import { cn } from '@/components/utils';
import { MessageSquare } from 'lucide-react';

export interface MessageListProps {
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyStateComponent?: React.ReactNode;
  className?: string;
}

export function MessageList({
  children,
  isEmpty = false,
  emptyMessage = 'Start a conversation with CSPR.AI',
  emptyStateComponent,
  className
}: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [children]);

  return (
    <div className={cn("flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-8 scrollbar-hide", className)}>
      <div className="mx-auto max-w-3xl space-y-4 md:space-y-8">
        {isEmpty ? (
          emptyStateComponent ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {emptyStateComponent}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                   <MessageSquare className="h-10 w-10 text-primary" />
               </div>
               <h3 className="text-xl font-semibold mb-2">Welcome to CSPR.AI</h3>
               <p className="text-muted-foreground max-w-sm mb-8">
                 Your intelligent assistant for the Casper blockchain. Ask about accounts, transactions, or explore the network.
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  {['Check my balance', 'How does Casper consensus work?', 'Show recent blocks', 'Create a new account'].map((suggestion) => (
                      <button
                          key={suggestion}
                          className="text-sm bg-card hover:bg-accent/50 border border-border/50 rounded-xl p-3 text-left transition-colors text-muted-foreground hover:text-foreground"
                      >
                          {suggestion}
                      </button>
                  ))}
               </div>
            </div>
          )
        ) : (
          children
        )}
        <div ref={bottomRef} className="h-px w-full" />
      </div>
    </div>
  );
}