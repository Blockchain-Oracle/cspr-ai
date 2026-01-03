'use client';

import * as React from 'react';
import { Wallet, LogOut, Loader2, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface WalletConnectProps {
  isConnected: boolean;
  address?: string;
  isConnecting?: boolean;
  error?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  theme?: 'light' | 'dark';
  variant?: 'button' | 'dropdown';
}

export function WalletConnect({
  isConnected,
  address,
  isConnecting = false,
  error,
  onConnect,
  onDisconnect,
  theme = 'dark',
  variant = 'button',
}: WalletConnectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isConnected && address) {
        return (
            <div className="relative group">
                <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="font-mono text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all pl-2 pr-3"
                >
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                    {address.slice(0, 5)}...{address.slice(-5)}
                    <ChevronDown className={cn("ml-2 h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
                </Button>
                
                {/* Dropdown Menu - Simple implementation without Portal for now */}
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-popover p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-2 py-2">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Active Account</p>
                                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 border border-border/50">
                                    <span className="text-xs font-mono truncate max-w-[140px]">{address}</span>
                                    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="h-px bg-border/50 my-1" />
                            
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                fullWidth 
                                onClick={onDisconnect} 
                                className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                <LogOut className="mr-2 h-3 w-3" />
                                Disconnect
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <Button 
                onClick={onConnect} 
                isLoading={isConnecting}
                variant="primary"
                leftIcon={!isConnecting && <Wallet className="h-4 w-4" />}
                className="shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105"
            >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            {error && (
                <p className="text-[10px] text-red-500 mt-1 absolute -bottom-5 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
}