/**
 * Wallet types for CSPR.click integration
 * Based on CSPR.click SDK v1.9.0 (CDN version)
 */

export interface ActiveAccount {
  publicKey: string;
  provider: string;
  balance?: string;
  accountHash?: string;
}

export interface WalletState {
  activeAccount: ActiveAccount | null;
  isConnecting: boolean;
  isConnected: boolean;
  isReady: boolean; // true when wallet bridge is initialized
  isSigning: boolean; // true when signing a transaction
}

export interface SignDeployResult {
  success: boolean;
  signedDeploy?: object;
  deployHash?: string;
  error?: string;
  cancelled?: boolean;
}

export interface WalletContextValue extends WalletState {
  signIn: () => void;
  signOut: () => void;
  disconnect: () => void;
  signDeploy: (unsignedDeploy: object) => Promise<SignDeployResult>;
}

// Supported wallet providers
export const SUPPORTED_PROVIDERS = [
  'casper-wallet',
  'ledger',
  'torus-wallet',
  'casperdash',
  'metamask-snap',
  'casper-signer',
] as const;

export type WalletProvider = typeof SUPPORTED_PROVIDERS[number];
