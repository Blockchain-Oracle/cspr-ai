'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, Coins } from 'lucide-react';

export interface TokenBalance {
  contract_package_hash: string;
  token_name?: string;
  token_symbol?: string;
  balance: string;
  decimals?: number;
  updated_at?: string;
}

export interface TokenBalanceListProps {
  account: string;
  tokens: TokenBalance[];
  isLoading?: boolean;
  onTokenClick?: (contractHash: string) => void;
  onTransfer?: (contractHash: string) => void;
  emptyMessage?: string;
  theme?: 'light' | 'dark';
}

export function TokenBalanceList({
  account,
  tokens,
  isLoading = false,
  onTokenClick,
  onTransfer,
  emptyMessage = 'No tokens found',
  theme = 'dark',
}: TokenBalanceListProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
              ))}
          </div>
      );
  }

  if (tokens.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center p-8 border rounded-xl bg-card/50 text-muted-foreground border-dashed">
              <Coins className="h-8 w-8 mb-2 opacity-50" />
              <p>{emptyMessage}</p>
          </div>
      );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
       {tokens.map((token, index) => (
           <motion.div
              key={token.contract_package_hash}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
           >
               <Card 
                  padding="sm" 
                  className="group hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => onTokenClick?.(token.contract_package_hash)}
               >
                   <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Coins className="h-12 w-12 -rotate-12" />
                   </div>

                   <div className="flex items-start justify-between mb-3 relative z-10">
                       <div className="flex items-center gap-3">
                           {/* Placeholder Icon */}
                           <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center text-xs font-bold border border-white/10 text-primary">
                               {token.token_symbol?.substring(0, 2) || "??"}
                           </div>
                           <div>
                               <h4 className="font-bold text-base leading-tight">{token.token_symbol || "Unknown"}</h4>
                               <span className="text-xs text-muted-foreground">{token.token_name || "CEP-18 Token"}</span>
                           </div>
                       </div>
                   </div>

                   <div className="relative z-10">
                       <div className="text-2xl font-bold tracking-tight text-foreground mb-3">
                           {token.balance}
                       </div>
                       
                       <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/50 max-w-[140px]">
                               <span className="text-[10px] font-mono text-muted-foreground truncate">
                                   {token.contract_package_hash.slice(0, 6)}...{token.contract_package_hash.slice(-6)}
                               </span>
                               <button 
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  onClick={(e) => handleCopy(e, token.contract_package_hash)}
                               >
                                   {copied === token.contract_package_hash ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                               </button>
                           </div>
                           
                           {onTransfer && (
                               <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="ml-auto h-7 text-xs px-2 hover:bg-primary/10 hover:text-primary"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      onTransfer(token.contract_package_hash);
                                  }}
                               >
                                   Transfer
                               </Button>
                           )}
                       </div>
                   </div>
               </Card>
           </motion.div>
       ))}
    </div>
  );
}