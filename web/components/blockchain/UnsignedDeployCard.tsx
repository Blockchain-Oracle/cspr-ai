'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronDown, ChevronRight, FileCode, Wallet } from 'lucide-react';

export interface UnsignedDeployData {
  type: string;
  from: string;
  to?: string;
  amount?: string;
  network: string;
  unsigned_deploy: object;
  contract_address?: string;
  token_id?: string;
  pool_id?: string;
  token_a?: string;
  token_b?: string;
  proposal_id?: string;
  description?: string;
}

export interface UnsignedDeployCardProps {
  data: UnsignedDeployData;
  onSign?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isSigned?: boolean;
  isCancelled?: boolean;
  deployHash?: string;
  theme?: 'light' | 'dark';
  network?: 'testnet' | 'mainnet';
}

export function UnsignedDeployCard({
  data,
  onSign,
  onCancel,
  isLoading = false,
  isSigned = false,
  isCancelled = false,
  deployHash,
  theme = 'dark',
  network = 'testnet',
}: UnsignedDeployCardProps) {
  const [showRaw, setShowRaw] = React.useState(false);

  const isMainnet = data.network.toLowerCase() === 'casper' || data.network.toLowerCase() === 'mainnet';

  // Analyze the deploy structure to determine what type it is
  const deployAnalysis = React.useMemo(() => {
    const deploy = data.unsigned_deploy as any;
    const session = deploy?.session;

    // Check session type - MCP outputs lowercase, SDK outputs PascalCase
    const isNativeTransfer = session?.Transfer !== undefined || session?.transfer !== undefined;
    const isContractCall = session?.StoredContractByHash !== undefined || session?.stored_contract_by_hash !== undefined;
    const isContractDeployment = session?.ModuleBytes !== undefined || session?.module_bytes !== undefined;

    // Also recognize StoredContractByName (used for delegation to auction contract)
    const isContractByName = session?.StoredContractByName !== undefined || session?.stored_contract_by_name !== undefined;

    // Recognize simplified MCP format (has deploy_type or contract_address at root level, no session)
    const isSimplifiedFormat = deploy?.deploy_type !== undefined ||
                               (deploy?.contract_address !== undefined && !session) ||
                               (deploy?.entry_point !== undefined && !session);

    // Only check for placeholder in contract deployments
    let needsWasmCompilation = false;
    if (isContractDeployment) {
      const moduleBytes = session.ModuleBytes || session.module_bytes;
      const sessionStr = JSON.stringify(moduleBytes);
      needsWasmCompilation = sessionStr.includes('[WASM_BYTES_PLACEHOLDER]');
    }

    return {
      isNativeTransfer,
      isContractCall,
      isContractDeployment,
      isContractByName,
      isSimplifiedFormat,
      needsWasmCompilation,
    };
  }, [data.unsigned_deploy]);

  // Can sign if it's a transfer, contract call, contract by name, simplified format, or a contract deployment with real WASM
  const canSign = deployAnalysis.isNativeTransfer ||
                  deployAnalysis.isContractCall ||
                  deployAnalysis.isContractByName ||
                  deployAnalysis.isSimplifiedFormat ||
                  (deployAnalysis.isContractDeployment && !deployAnalysis.needsWasmCompilation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full my-4"
    >
      <div className={cn(
        "relative rounded-xl overflow-hidden border-2 bg-card shadow-lg transition-all",
        isMainnet ? "border-red-500/20 shadow-red-500/5" : "border-primary/50 shadow-primary/10",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-50 before:pointer-events-none"
      )}>
        {/* Header / Banner */}
        <div className={cn(
          "px-4 py-3 flex items-center justify-between border-b",
          isMainnet ? "bg-red-500/10 border-red-500/20" : "bg-primary/10 border-primary/20"
        )}>
           <div className="flex items-center gap-2">
              <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full shadow-sm",
                  isMainnet ? "bg-red-500 text-white" : "bg-primary text-white"
              )}>
                  <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Action Required</span>
                  <span className="text-sm font-semibold">Sign Transaction</span>
              </div>
           </div>
           
           <div className={cn(
               "text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest",
               isMainnet ? "bg-red-500 text-white border-red-600" : "bg-green-500/20 text-green-500 border-green-500/30"
           )}>
               {data.network.toUpperCase()}
           </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Transaction Type</span>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold capitalize text-foreground">{data.type.replace(/_/g, ' ')}</span>
                    {data.amount && (
                        <span className="text-xl font-mono text-muted-foreground">
                             • <span className="text-foreground">{data.amount}</span>
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">From Account</span>
                    <span className="font-mono break-all">{data.from}</span>
                </div>
                {data.to && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">To Recipient</span>
                        <span className="font-mono break-all">{data.to}</span>
                    </div>
                )}
                {data.contract_address && (
                     <div className="p-3 rounded-lg bg-muted/50 border border-border/50 md:col-span-2">
                        <span className="text-xs text-muted-foreground block mb-1">Contract / Pool</span>
                        <span className="font-mono break-all">{data.contract_address}</span>
                    </div>
                )}
                 {data.description && (
                     <div className="p-3 rounded-lg bg-muted/50 border border-border/50 md:col-span-2">
                        <span className="text-xs text-muted-foreground block mb-1">Description</span>
                        <p className="text-foreground/90">{data.description}</p>
                    </div>
                )}
            </div>
            
            {/* Raw Data Toggle */}
            <div>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                    {showRaw ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {showRaw ? "Hide Raw Deploy Data" : "Show Raw Deploy Data"}
                </button>

                {showRaw && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-2"
                    >
                        <div className="bg-black/80 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40 border border-white/10 shadow-inner">
                            <pre>{JSON.stringify(data.unsigned_deploy, null, 2)}</pre>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* WASM Deploy Notice - only show for contract deployments with placeholder */}
            {deployAnalysis.needsWasmCompilation && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <div className="flex items-start gap-2">
                        <FileCode className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="text-xs space-y-1">
                            <p className="font-semibold">Contract Deployment Requires WASM</p>
                            <p className="text-amber-300/80">
                                This deploy contains a WASM bytecode placeholder. The MCP server needs pre-compiled WASM files.
                            </p>
                            <p className="text-amber-300/80">
                                Ensure WASM files exist in <code className="bg-black/30 px-1 rounded">contracts/wasm/</code>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Hash Display (when submitted to network) */}
            {isSigned && deployHash && (
                <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/30 dark:border-emerald-400/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 backdrop-blur-sm shadow-lg">
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-teal-400/10 to-cyan-400/10 dark:from-emerald-400/5 dark:via-teal-400/5 dark:to-cyan-400/5 animate-pulse" />

                    <div className="relative p-4 flex items-start gap-3">
                        {/* Success Icon with gradient background */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/50 dark:shadow-emerald-400/30">
                            <Check className="h-5 w-5 text-white" strokeWidth={3} />
                        </div>

                        <div className="flex-1 space-y-2.5">
                            {/* Header */}
                            <div>
                                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                                    ✓ Transaction Submitted Successfully
                                </p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5">
                                    Your transaction has been broadcast to the Casper blockchain
                                </p>
                            </div>

                            {/* Deploy Hash */}
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                                    Deploy Hash:
                                </span>
                                <code className="block bg-emerald-900/10 dark:bg-emerald-100/10 border border-emerald-300/30 dark:border-emerald-500/30 px-3 py-2 rounded-lg font-mono text-emerald-900 dark:text-emerald-100 break-all text-[11px] leading-relaxed shadow-inner">
                                    {deployHash}
                                </code>
                            </div>

                            {/* Status Info with Explorer Link */}
                            <div className="flex items-start gap-2 pt-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse mt-1.5" />
                                <div className="flex-1 space-y-1.5">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        ⏱️ Execution in progress (2-3 minutes)
                                    </p>
                                    <a
                                        href={`https://${network === 'mainnet' ? '' : 'testnet.'}cspr.live/deploy/${deployHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-400/50 hover:decoration-emerald-600 dark:decoration-emerald-500/50 dark:hover:decoration-emerald-400 underline-offset-2 transition-colors"
                                    >
                                        <span>View in Explorer</span>
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Cancelled Display */}
            {isCancelled && (
                <div className="relative overflow-hidden rounded-xl border-2 border-gray-500/30 dark:border-gray-400/40 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50 backdrop-blur-sm shadow-lg">
                    {/* Static gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 via-slate-400/10 to-gray-400/10 dark:from-gray-400/5 dark:via-slate-400/5 dark:to-gray-400/5" />

                    <div className="relative p-4 flex items-start gap-3">
                        {/* Cancel Icon with gradient background */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-gray-500 to-slate-600 dark:from-gray-400 dark:to-slate-500 flex items-center justify-center shadow-lg shadow-gray-500/50 dark:shadow-gray-400/30">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>

                        <div className="flex-1">
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                ✕ Transaction Cancelled
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300/90 mt-0.5">
                                This transaction was cancelled and will not be submitted to the network
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-3">
                <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={canSign ? onSign : undefined}
                    isLoading={isLoading}
                    disabled={isSigned || isCancelled || !canSign || isLoading}
                    className={cn(
                        "font-semibold shadow-lg transition-all",
                        canSign && !isLoading && !isSigned && !isCancelled && "hover:scale-[1.02]",
                        (!canSign || isLoading || isSigned || isCancelled) && "opacity-50 cursor-not-allowed",
                        isMainnet ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : "shadow-primary/25"
                    )}
                    leftIcon={isSigned ? <Check className="h-5 w-5" /> : isCancelled ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> : <Wallet className="h-5 w-5" />}
                >
                    {isSigned ? "Transaction Submitted" : isCancelled ? "Transaction Cancelled" : !canSign ? "Compilation Required" : isLoading ? "Signing & Submitting..." : "Sign & Submit"}
                </Button>

                {!isSigned && !isCancelled && canSign && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isLoading}
                        className={cn(
                            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        Cancel
                    </Button>
                )}
            </div>

            {isMainnet && canSign && (
                <div className="flex items-center gap-2 justify-center text-xs text-red-400 mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    <span>This is a real transaction on Mainnet. Proceed with caution.</span>
                </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}