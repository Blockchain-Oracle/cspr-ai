'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Droplet, Plus, Minus, AlertTriangle, RefreshCw } from 'lucide-react';

export interface DexPoolData {
  contract_address: string;
  pool_id: string;
  token_a: string;
  token_b: string;
  token_a_name?: string;
  token_b_name?: string;
  reserve_a: string;
  reserve_b: string;
  total_lp_supply: string;
  fee_bps: number;
  user_lp_balance?: string;
  swap_quote?: {
    token_in: string;
    amount_in: string;
    amount_out: string;
  };
}

export interface DexPoolCardProps {
  pool: DexPoolData;
  isLoading?: boolean;
  onAddLiquidity?: () => void;
  onRemoveLiquidity?: () => void;
  onSwap?: () => void;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export function DexPoolCard({
  pool,
  isLoading = false,
  onAddLiquidity,
  onRemoveLiquidity,
  onSwap,
  compact = false,
  theme = 'dark',
}: DexPoolCardProps) {
  
  // Calculate ratios (simplified)
  const resA = parseFloat(pool.reserve_a.replace(/,/g, ''));
  const resB = parseFloat(pool.reserve_b.replace(/,/g, ''));
  const total = resA + resB; // Very rough visualization logic, usually prices differ
  const percentA = total > 0 ? (resA / total) * 100 : 50;
  
  return (
    <Card className={cn(
        "w-full border-border/60 bg-gradient-to-br from-card to-background overflow-hidden relative",
        compact ? "p-0" : ""
    )} padding={compact ? 'none' : 'md'}>
        
        {/* Compact View */}
        {compact && (
             <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                     <div className="flex -space-x-2">
                         <div className="h-8 w-8 rounded-full bg-blue-500/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-blue-500">
                             {pool.token_a_name?.substring(0, 1) || "A"}
                         </div>
                         <div className="h-8 w-8 rounded-full bg-purple-500/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-purple-500">
                             {pool.token_b_name?.substring(0, 1) || "B"}
                         </div>
                     </div>
                     <div>
                         <div className="font-semibold text-sm">{pool.token_a_name || "TKA"} / {pool.token_b_name || "TKB"}</div>
                         <div className="text-[10px] text-muted-foreground">Fee: {(pool.fee_bps / 100).toFixed(2)}%</div>
                     </div>
                 </div>
                 <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                     View
                 </Button>
             </div>
        )}

        {/* Full View */}
        {!compact && (
            <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                             <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md z-10">
                                 {pool.token_a_name?.substring(0, 1) || "A"}
                             </div>
                             <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                 {pool.token_b_name?.substring(0, 1) || "B"}
                             </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {pool.token_a_name || "Token A"} <span className="text-muted-foreground">/</span> {pool.token_b_name || "Token B"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                <span>Fee: {(pool.fee_bps / 100).toFixed(2)}%</span>
                                <span>•</span>
                                <span>Pool ID: {pool.pool_id.slice(0, 6)}...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {onSwap && (
                            <Button size="sm" variant="primary" onClick={onSwap} leftIcon={<ArrowLeftRight className="h-3.5 w-3.5" />}>
                                Swap
                            </Button>
                        )}
                    </div>
                </div>

                {/* Reserves Visual */}
                <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex justify-between text-sm font-medium mb-2">
                        <span>{pool.token_a_name || "Token A"}</span>
                        <span>{pool.token_b_name || "Token B"}</span>
                    </div>
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden flex mb-2">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${percentA}%` }}
                           className="h-full bg-blue-500" 
                        />
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${100 - percentA}%` }}
                           className="h-full bg-purple-500" 
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>{pool.reserve_a}</span>
                        <span>{pool.reserve_b}</span>
                    </div>
                </div>

                {/* Liquidity Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-card border border-border/50">
                         <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Total Liquidity</span>
                         <span className="font-semibold">{pool.total_lp_supply} LP</span>
                    </div>
                    {pool.user_lp_balance && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                             <span className="text-[10px] text-primary/80 uppercase tracking-wider block mb-1">Your Liquidity</span>
                             <span className="font-semibold text-primary">{pool.user_lp_balance} LP</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                     {onAddLiquidity && (
                         <Button variant="outline" size="sm" onClick={onAddLiquidity} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                             Add Liquidity
                         </Button>
                     )}
                     {onRemoveLiquidity && (
                         <Button variant="outline" size="sm" onClick={onRemoveLiquidity} leftIcon={<Minus className="h-3.5 w-3.5" />}>
                             Remove Liquidity
                         </Button>
                     )}
                </div>

                {/* Swap Quote Preview (if active) */}
                {pool.swap_quote && (
                    <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                         <div className="flex items-center gap-2 text-xs text-yellow-500 font-medium mb-1">
                             <RefreshCw className="h-3 w-3 animate-spin" />
                             Swap Preview
                         </div>
                         <div className="flex items-center justify-between text-sm">
                             <span>{pool.swap_quote.amount_in} {pool.swap_quote.token_in}</span>
                             <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                             <span className="font-bold">{pool.swap_quote.amount_out}</span>
                         </div>
                    </div>
                )}
            </>
        )}
    </Card>
  );
}