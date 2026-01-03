'use client';

import * as React from 'react';
import { Wallet, Shield, Zap, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/components/utils';

export interface WalletConnectPromptProps {
  className?: string;
}

/**
 * Prompt shown in chat when wallet is not connected
 * Encourages users to connect their wallet for full functionality
 */
export function WalletConnectPrompt({ className }: WalletConnectPromptProps) {
  const { signIn, isConnecting, isReady } = useWallet();

  // Show loading state while wallet SDK initializes
  if (!isReady) {
    return (
      <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)} padding="md">
        <div className="text-center max-w-sm mx-auto py-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 animate-pulse">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <h3 className="text-base font-semibold mb-1">Initializing Wallet</h3>
          <p className="text-xs text-muted-foreground">
            Loading connection service...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)} padding="md">
      <div className="text-center max-w-sm mx-auto">
        {/* Icon with gradient background - Smaller */}
        <div className="relative mx-auto w-12 h-12 mb-3">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
          <div className="relative w-full h-full rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Title - Smaller */}
        <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Connect Wallet
        </h3>

        {/* Description - Compact */}
        <p className="text-muted-foreground text-xs mb-4 max-w-xs mx-auto">
          Sign transactions and interact with smart contracts
        </p>

        {/* Features - More Compact with smaller gap */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium">Fast</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium">Private</span>
          </div>
        </div>

        {/* Connect Button - Slightly smaller */}
        <Button
          variant="primary"
          onClick={signIn}
          disabled={isConnecting}
          leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>

        {/* Supported wallets hint - Smaller */}
        <p className="text-[10px] text-muted-foreground/70 mt-2">
          CSPR.click • Casper Wallet • Ledger
        </p>
      </div>
    </Card>
  );
}
