'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/components/utils';

export interface ChatInterfaceProps {
  children: React.ReactNode;
  inputComponent: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
}

export function ChatInterface({
  children,
  inputComponent,
  isLoading = false,
  error = null,
}: ChatInterfaceProps) {
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
       {/* Error Banner */}
       {error && (
         <div className="bg-destructive/10 border-b border-destructive/20 p-2 text-center text-xs md:text-sm text-destructive flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 z-20 absolute w-full top-0">
             <AlertCircle className="h-4 w-4" />
             {error}
         </div>
       )}

       {/* Message Area */}
       <div className="flex-1 overflow-hidden relative flex flex-col w-full max-w-4xl mx-auto">
           {children}
       </div>

       {/* Input Area */}
       <div className="w-full border-t border-border/40 bg-background/80 backdrop-blur-md pb-6 pt-4 px-4 z-10">
           <div className="max-w-3xl mx-auto">
               {inputComponent}
               <div className="text-center mt-3">
                  <p className="text-[10px] text-muted-foreground/60 select-none">
                     CSPR.AI uses Casper blockchain tools. Always verify transaction details.
                  </p>
               </div>
           </div>
       </div>
    </div>
  );
}