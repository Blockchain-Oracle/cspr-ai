/**
 * Re-export useWallet hook from provider
 * Uses iframe-based WalletProvider for React 19 compatibility
 */
export { useWallet } from '@/providers/WalletProvider';
export type { WalletContextValue } from '@/types/wallet';
