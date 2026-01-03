// Use iframe-based WalletProvider for React 19 compatibility
// CSPR.click SDK v1.12.x uses React internals incompatible with React 19
export { WalletProvider, useWallet, WalletContext } from './WalletProvider';
