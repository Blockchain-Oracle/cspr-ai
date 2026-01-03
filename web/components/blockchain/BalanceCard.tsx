'use client';

import * as React from 'react';
import { RefreshCw, Copy, Check, Wallet } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface BalanceCardProps {
  balance: string;
  usdValue?: string;
  address: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  theme?: 'light' | 'dark';
}

export function BalanceCard({
  balance,
  usdValue,
  address,
  isLoading = false,
  onRefresh,
  theme = 'dark',
}: BalanceCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedAddress = address.length > 16 
    ? `${address.slice(0, 10)}...${address.slice(-6)}` 
    : address;

  return (
    <Card className="w-full relative overflow-hidden bg-gradient-to-br from-card to-primary/5 border-primary/20">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
         <Wallet className="h-32 w-32 rotate-12" />
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
         <div className="flex items-center justify-between">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</span>
             <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading} className={cn("h-7 w-7 text-muted-foreground", isLoading && "animate-spin")}>
                 <RefreshCw className="h-3.5 w-3.5" />
             </Button>
         </div>

         <div>
             <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {isLoading ? "..." : balance}
                 </span>
                 <span className="text-lg font-medium text-muted-foreground">CSPR</span>
             </div>
             {usdValue && !isLoading && (
                 <p className="text-sm font-medium text-muted-foreground/80 mt-1">
                     ≈ {usdValue} USD
                 </p>
             )}
         </div>

         <div className="flex items-center gap-2 mt-4 bg-muted/40 p-2 rounded-lg w-fit border border-border/50 group hover:bg-muted/60 transition-colors">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{truncatedAddress}</span>
             <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-muted-foreground hover:text-foreground" onClick={handleCopy} title="Copy Address">
                 {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
             </Button>
         </div>
      </div>
    </Card>
  );
}