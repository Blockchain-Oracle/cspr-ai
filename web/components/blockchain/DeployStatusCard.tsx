'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, Check, RotateCw, AlertTriangle } from 'lucide-react';

export type DeployStatus = 'pending' | 'success' | 'failed';

export interface DeployStatusData {
  deploy_hash: string;
  status: DeployStatus;
  block_hash?: string;
  block_height?: number;
  cost_motes?: string;
  cost_cspr?: string;
  timestamp?: string;
  error_message?: string;
  execution_type?: string;
  from?: string;
  entry_point?: string;
  contract_hash?: string;
}

export interface DeployStatusCardProps {
  deploy: DeployStatusData;
  isLoading?: boolean;
  isPolling?: boolean;
  onRefresh?: () => void;
  onViewInExplorer?: () => void;
  network?: 'testnet' | 'mainnet';
  theme?: 'light' | 'dark';
}

export function DeployStatusCard({
  deploy,
  isLoading = false,
  isPolling = false,
  onRefresh,
  onViewInExplorer,
  network = 'testnet',
  theme = 'dark',
}: DeployStatusCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(deploy.deploy_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = {
      pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Pending" },
      success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", label: "Success" },
      failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Failed" },
  }[deploy.status];

  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn(
        "w-full overflow-hidden transition-all duration-500", 
        deploy.status === 'pending' && "border-yellow-500/30 shadow-yellow-500/5",
        deploy.status === 'success' && "border-green-500/30 shadow-green-500/5",
        deploy.status === 'failed' && "border-red-500/30 shadow-red-500/5"
    )}>
       <div className="p-5">
           {/* Header */}
           <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                   <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border", statusConfig.bg, statusConfig.color, statusConfig.border)}>
                       <StatusIcon className={cn("h-5 w-5", deploy.status === 'pending' && "animate-spin")} />
                   </div>
                   <div>
                       <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base">Transaction Status</h3>
                            {isPolling && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                </span>
                            )}
                       </div>
                       <div className={cn("text-xs font-bold uppercase tracking-wider", statusConfig.color)}>
                           {statusConfig.label}
                       </div>
                   </div>
               </div>

               <div className="flex gap-2">
                   {onRefresh && (
                       <Button size="icon" variant="ghost" onClick={onRefresh} className={cn("h-8 w-8 text-muted-foreground", isPolling && "animate-spin")}>
                           <RotateCw className="h-4 w-4" />
                       </Button>
                   )}
               </div>
           </div>

           {/* Details Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
               <div className="p-3 bg-muted/40 rounded-lg border border-border/50 col-span-1 md:col-span-2">
                   <span className="text-xs text-muted-foreground block mb-1">Deploy Hash</span>
                   <div className="flex items-center justify-between gap-2 font-mono bg-background/50 p-1.5 rounded border border-border/30">
                       <span className="truncate">{deploy.deploy_hash}</span>
                       <button onClick={handleCopy} className="hover:text-primary transition-colors">
                           {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                       </button>
                   </div>
               </div>
               
               {deploy.cost_cspr && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">Cost</span>
                        <div className="font-mono font-medium">{deploy.cost_cspr} CSPR</div>
                    </div>
               )}
               
               {deploy.block_height && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">Block Height</span>
                        <div className="font-mono font-medium">{deploy.block_height.toLocaleString()}</div>
                    </div>
               )}
           </div>

           {/* Error Message */}
           {deploy.status === 'failed' && deploy.error_message && (
               <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                   <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                   <p className="font-mono break-all">{deploy.error_message}</p>
               </div>
           )}

           {/* Footer Actions */}
           <div className="flex justify-end pt-2 border-t border-border/40">
               {onViewInExplorer && (
                   <Button variant="ghost" size="sm" onClick={onViewInExplorer} className="text-xs text-muted-foreground hover:text-primary" rightIcon={<ExternalLink className="h-3 w-3" />}>
                       View in Explorer
                   </Button>
               )}
           </div>
       </div>
    </Card>
  );
}

export interface DeployHistoryListProps {
  account: string;
  deploys: DeployStatusData[];
  isLoading?: boolean;
  onDeployClick?: (deployHash: string) => void;
  emptyMessage?: string;
  network?: 'testnet' | 'mainnet';
  theme?: 'light' | 'dark';
}

export function DeployHistoryList({
  account,
  deploys,
  isLoading = false,
  onDeployClick,
  emptyMessage = 'No deploys found',
  network = 'testnet',
  theme = 'dark',
}: DeployHistoryListProps) {
    if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}</div>;

    if (deploys.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">{emptyMessage}</div>;

    return (
        <div className="space-y-2">
            {deploys.map((deploy) => (
                <div 
                    key={deploy.deploy_hash} 
                    onClick={() => onDeployClick?.(deploy.deploy_hash)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            deploy.status === 'success' ? "bg-green-500" : deploy.status === 'failed' ? "bg-red-500" : "bg-yellow-500 animate-pulse"
                        )} />
                        <div>
                            <div className="font-mono text-xs font-medium group-hover:text-primary transition-colors">
                                {deploy.execution_type || "Transaction"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                {deploy.timestamp ? new Date(deploy.timestamp).toLocaleString() : "Unknown time"}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-xs">{deploy.cost_cspr ? `${deploy.cost_cspr} CSPR` : "-"}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{deploy.status}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}