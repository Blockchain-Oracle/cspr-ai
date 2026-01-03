'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import of WalletProvider to prevent SSR issues
// Uses iframe isolation to work around React 19 incompatibility with CSPR.click SDK
const WalletProvider = dynamic(
  () => import('@/providers/WalletProvider').then((mod) => mod.WalletProvider),
  { ssr: false }
);

interface ClientProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * Uses iframe-based WalletProvider because CSPR.click SDK v1.12.x
 * is incompatible with React 19 (uses removed ReactCurrentDispatcher API)
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return <WalletProvider>{children}</WalletProvider>;
}
