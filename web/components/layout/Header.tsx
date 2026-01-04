'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/shared/Button';
import { Logo } from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/components/utils';

export interface HeaderProps {
  showNav?: boolean;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({
  showNav = true,
  theme: propTheme,
  onThemeToggle: propOnThemeToggle,
  isMobileMenuOpen,
  onMobileMenuToggle,
}: HeaderProps) {
  const { theme: nextTheme, setTheme } = useTheme();
  const { activeAccount, isConnecting, isConnected, isReady, signIn, disconnect } = useWallet();
  const [mounted, setMounted] = React.useState(false);
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  // Determine current theme
  const currentTheme = (propTheme || (mounted ? nextTheme : 'dark')) as 'light' | 'dark';
  
  // Handle toggle
  const handleThemeToggle = propOnThemeToggle || (() => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
  
  const isMenuOpen = isMobileMenuOpen ?? internalIsOpen;
  
  const toggleMenu = () => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle();
    } else {
      setInternalIsOpen(prev => !prev);
    }
  };

  const closeMenu = () => {
    if (onMobileMenuToggle && isMenuOpen) {
      onMobileMenuToggle();
    } else {
      setInternalIsOpen(false);
    }
  };

  const navLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Use Cases', href: '/#use-cases' },
    { label: 'Chat', href: '/chat' },
    { label: 'Docs', href: 'https://docs.cspr-ai.xyz', external: true },
    { label: 'About', href: '/about' },
  ];

  // Mobile drawer only shows Chat, Docs, and About
  const mobileNavLinks = navLinks.filter(link =>
    link.label === 'Chat' || link.label === 'Docs' || link.label === 'About'
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
             <Logo size="md" />
          </Link>

          {showNav && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navLinks.map(link => (
                 <Link
                   key={link.href}
                   href={link.href}
                   target={link.external ? "_blank" : undefined}
                   rel={link.external ? "noopener noreferrer" : undefined}
                   className="text-muted-foreground transition-colors hover:text-primary"
                 >
                   {link.label}
                 </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
           {/* Desktop Actions */}
           <div className="hidden md:flex items-center gap-4">
              <ThemeToggle theme={currentTheme} onToggle={handleThemeToggle} />

              {isConnected && activeAccount ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm">
                      {formatAddress(activeAccount.publicKey)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 hover:bg-primary/20 rounded transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={disconnect}
                    title="Disconnect wallet"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Wallet className="h-4 w-4" />}
                  onClick={signIn}
                  disabled={!isReady || isConnecting}
                  className="hidden sm:flex"
                >
                  {!isReady ? 'Loading...' : isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
           </div>

           {/* Mobile Menu Toggle */}
           <Button
             variant="ghost"
             size="icon"
             className="md:hidden"
             onClick={toggleMenu}
           >
             <Menu className="h-6 w-6" />
             <span className="sr-only">Toggle menu</span>
           </Button>
        </div>
      </div>

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        theme={currentTheme}
        onThemeToggle={handleThemeToggle}
        navLinks={mobileNavLinks}
        isConnected={isConnected}
        activeAccount={activeAccount}
        isConnecting={isConnecting}
        isReady={isReady}
        onConnect={signIn}
        onDisconnect={disconnect}
      />
    </header>
  );
}
