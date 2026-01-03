'use client';

import * as React from 'react';
import { X, Wallet, LogOut, Copy, Check } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/shared/Button';
import Link from 'next/link';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  navLinks?: { label: string; href: string }[];
  // Wallet props
  isConnected?: boolean;
  activeAccount?: { publicKey: string } | null;
  isConnecting?: boolean;
  isReady?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  theme = 'dark',
  onThemeToggle,
  navLinks = [],
  isConnected = false,
  activeAccount = null,
  isConnecting = false,
  isReady = true,
  onConnect,
  onDisconnect,
}: MobileMenuProps) {
  const [copied, setCopied] = React.useState(false);

  // Copy address to clipboard
  const handleCopyAddress = () => {
    if (activeAccount?.publicKey) {
      navigator.clipboard.writeText(activeAccount.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="bottom">
      <DrawerContent className="bg-background border-t border-border text-foreground">
        <DrawerTitle className="sr-only">Mobile Menu</DrawerTitle>
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-2" />
        <div className="px-4 pb-6 space-y-4">
          {/* Logo & Close */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <Link href="/" onClick={onClose}>
              <Logo size="md" />
            </Link>
            <DrawerClose asChild>
              <button className="p-2 text-foreground hover:bg-accent rounded-lg transition-colors">
                <X className="h-6 w-6" />
              </button>
            </DrawerClose>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="block px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Connection */}
          <div className="pt-4 border-t border-border">
            <div className="px-4 py-2">
              <span className="text-sm font-medium text-foreground mb-3 block">Wallet</span>
              {isConnected && activeAccount ? (
                <div className="space-y-3">
                  {/* Connected Address Card */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 rounded-lg border border-primary/20">
                    <Wallet className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-mono text-sm flex-1 truncate">
                      {formatAddress(activeAccount.publicKey)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1.5 hover:bg-primary/20 rounded transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Disconnect Button */}
                  {onDisconnect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDisconnect}
                      leftIcon={<LogOut className="h-4 w-4" />}
                      className="w-full justify-center text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Disconnect Wallet
                    </Button>
                  )}
                </div>
              ) : (
                /* Connect Button */
                onConnect && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onConnect}
                    disabled={!isReady || isConnecting}
                    leftIcon={!isConnecting && <Wallet className="h-4 w-4" />}
                    isLoading={isConnecting}
                    className="w-full justify-center shadow-md shadow-primary/20"
                  >
                    {!isReady ? 'Loading...' : isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium">Switch Theme</span>
              {onThemeToggle && (
                <ThemeToggle theme={theme} onToggle={onThemeToggle} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2">
            <p className="text-xs text-center text-muted-foreground">
              © 2025 CSPR.AI
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}