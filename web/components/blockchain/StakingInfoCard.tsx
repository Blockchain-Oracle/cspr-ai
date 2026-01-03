'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, User, Plus } from 'lucide-react';

export interface Delegation {
  validator_public_key: string;
  validator_name?: string;
  staked_amount_cspr: string;
  percentage?: number;
}

export interface StakingInfoCardProps {
  delegator: string;
  delegations: Delegation[];
  total_staked_cspr: string;
  isLoading?: boolean;
  onAddDelegation?: () => void;
  onViewValidator?: (validatorKey: string) => void;
  theme?: 'light' | 'dark';
}

export function StakingInfoCard({
  delegator,
  delegations,
  total_staked_cspr,
  isLoading = false,
  onAddDelegation,
  onViewValidator,
  theme = 'dark',
}: StakingInfoCardProps) {
  const sortedDelegations = [...delegations].sort((a, b) => 
    parseFloat(b.staked_amount_cspr.replace(/,/g, '')) - parseFloat(a.staked_amount_cspr.replace(/,/g, ''))
  );

  return (
    <Card className="w-full overflow-hidden border-border/60 bg-gradient-to-br from-card to-background">
       <div className="p-6">
           {/* Header */}
           <div className="flex items-start justify-between mb-6">
               <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                       <TrendingUp className="h-5 w-5" />
                   </div>
                   <div>
                       <h3 className="font-semibold text-lg leading-none mb-1">Staking Overview</h3>
                       <p className="text-xs text-muted-foreground font-mono">{delegator.slice(0, 10)}...{delegator.slice(-10)}</p>
                   </div>
               </div>
               
               <Button size="sm" variant="outline" onClick={onAddDelegation} leftIcon={<Plus className="h-4 w-4" />}>
                   Delegate
               </Button>
           </div>

           {/* Total Stake */}
           <div className="mb-8 p-4 rounded-2xl bg-muted/30 border border-border/50 text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
               <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Total Staked</span>
               <div className="flex items-baseline justify-center gap-2 mt-1">
                   <span className="text-3xl font-bold tracking-tight text-foreground">{total_staked_cspr}</span>
                   <span className="text-sm font-medium text-muted-foreground">CSPR</span>
               </div>
           </div>

           {/* Delegation List */}
           <div className="space-y-3">
               <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">Your Delegations</h4>
               
               {delegations.length === 0 ? (
                   <div className="text-center py-8 text-muted-foreground/60 border-2 border-dashed border-border/50 rounded-xl">
                       <PieChart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                       <p className="text-sm">No active delegations</p>
                   </div>
               ) : (
                   sortedDelegations.map((del, idx) => (
                       <motion.div 
                           key={del.validator_public_key}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: idx * 0.1 }}
                           className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/40 hover:border-primary/30 hover:bg-accent/20 transition-all cursor-pointer group"
                           onClick={() => onViewValidator?.(del.validator_public_key)}
                       >
                           <div className="flex items-center gap-3">
                               <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xs font-bold border border-indigo-500/20">
                                   {idx + 1}
                               </div>
                               <div>
                                   <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                       {del.validator_name || "Unknown Validator"}
                                   </div>
                                   <div className="font-mono text-[10px] text-muted-foreground">
                                       {del.validator_public_key.slice(0, 8)}...{del.validator_public_key.slice(-8)}
                                   </div>
                               </div>
                           </div>
                           
                           <div className="text-right">
                               <div className="font-bold text-sm">{del.staked_amount_cspr}</div>
                               {del.percentage && (
                                   <div className="text-[10px] text-muted-foreground">
                                       {del.percentage.toFixed(1)}% of portfolio
                                   </div>
                               )}
                           </div>
                       </motion.div>
                   ))
               )}
           </div>
       </div>
       
       {/* Footer Visual */}
       <div className="h-1.5 w-full bg-muted mt-2 flex">
            {sortedDelegations.map((del, i) => (
                <div 
                    key={i} 
                    className={cn(
                        "h-full", 
                        i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-indigo-500" : "bg-purple-500"
                    )}
                    style={{ width: `${del.percentage || (100 / sortedDelegations.length)}%` }} 
                />
            ))}
       </div>
    </Card>
  );
}