'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, Terminal, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/components/utils';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

export interface ToolResultCardProps {
  toolName: string;
  result: string | React.ReactNode;
  isError?: boolean;
  isLoading?: boolean;
}

export function ToolResultCard({
  toolName,
  result,
  isError = false,
  isLoading = false,
}: ToolResultCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!isLoading);

  // Auto-expand on error or when loading finishes
  React.useEffect(() => {
    if (!isLoading) {
       setIsExpanded(true);
    }
  }, [isLoading]);

  return (
    <div className="w-full my-2 animate-in fade-in zoom-in-95 duration-300">
        <div 
          className={cn(
            "rounded-lg border bg-card overflow-hidden transition-all shadow-sm",
            isError ? "border-destructive/50" : "border-border"
          )}
        >
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2.5">
                <div className={cn("p-1.5 rounded-md flex items-center justify-center shadow-sm", 
                    isLoading ? "bg-muted" : 
                    isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : 
                     isError ? <AlertCircle className="h-3.5 w-3.5" /> : 
                     <Terminal className="h-3.5 w-3.5" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold font-mono tracking-tight text-foreground/80">
                        {toolName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {isLoading ? "Executing..." : isError ? "Failed" : "Success"}
                    </span>
                </div>
            </div>
            
            <div className={cn("transition-transform duration-200 text-muted-foreground", isExpanded ? "rotate-180" : "rotate-0")}>
                <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          {isExpanded && (
            <div className="border-t border-border/50 bg-muted/30 p-3 font-mono text-xs overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-border">
                {isLoading ? (
                    <div className="flex flex-col gap-2 p-2">
                         <div className="h-2 w-3/4 bg-muted-foreground/10 rounded animate-pulse" />
                         <div className="h-2 w-1/2 bg-muted-foreground/10 rounded animate-pulse" />
                    </div>
                ) : (
                    <pre className="whitespace-pre-wrap break-words text-foreground/80">
                        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                    </pre>
                )}
            </div>
          )}
        </div>
    </div>
  );
}