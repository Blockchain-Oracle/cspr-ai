'use client';

import * as React from 'react';
import { ActiveAccount, WalletContextValue, SignDeployResult } from '@/types/wallet';

// Create wallet context
const WalletContext = React.createContext<WalletContextValue | null>(null);

// Message types for iframe communication
interface BridgeMessage {
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

/**
 * WalletProvider component
 * Uses an iframe to isolate CSPR.click SDK (React 18) from React 19 app
 * Communication happens via postMessage API
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [activeAccount, setActiveAccount] = React.useState<ActiveAccount | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [isSigning, setIsSigning] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const pendingRequests = React.useRef<Map<string, (result: unknown) => void>>(new Map());

  // Send message to iframe
  const sendMessage = React.useCallback((type: string, payload?: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        reject(new Error('Wallet bridge not ready'));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store pending request for async responses
      pendingRequests.current.set(requestId, resolve);

      // Set timeout for request
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);

      iframe.contentWindow.postMessage({ type, payload, requestId }, '*');
    });
  }, []);

  // Handle messages from iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent<BridgeMessage>) => {
      // Only handle messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      const { type, payload } = event.data || {};
      if (!type) return;

      switch (type) {
        case 'bridge:ready':
          setIsReady(true);
          break;

        case 'wallet:signed_in':
        case 'wallet:switched_account':
        case 'wallet:existing_session':
          if (payload && typeof payload === 'object') {
            setActiveAccount(payload as unknown as ActiveAccount);
          }
          setIsConnecting(false);
          break;

        case 'wallet:signed_out':
        case 'wallet:disconnected':
          setActiveAccount(null);
          setIsConnecting(false);
          break;

        case 'wallet:activeAccount':
          if (payload && typeof payload === 'object' && 'requestId' in payload) {
            const { account, requestId } = payload as { account: ActiveAccount | null; requestId: string };
            const resolver = pendingRequests.current.get(requestId);
            if (resolver) {
              pendingRequests.current.delete(requestId);
              resolver(account);
            }
          }
          break;

        case 'wallet:signResult':
        case 'wallet:sendResult':
          if (payload && typeof payload === 'object' && 'requestId' in payload) {
            const { requestId, ...result } = payload as { requestId: string; [key: string]: unknown };
            const resolver = pendingRequests.current.get(requestId);
            if (resolver) {
              pendingRequests.current.delete(requestId);
              // Pass the entire payload (minus requestId) as the result
              resolver(result);
            }
          }
          break;

        case 'bridge:error':
          if (payload && typeof payload === 'object' && 'requestId' in payload) {
            const { requestId } = payload as { error: string; requestId: string };
            const resolver = pendingRequests.current.get(requestId);
            if (resolver) {
              pendingRequests.current.delete(requestId);
              resolver(null);
            }
          }
          setIsConnecting(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Simple message sender for fire-and-forget commands (no response expected)
  const postMessage = React.useCallback((type: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      console.warn('Wallet bridge not ready');
      return;
    }
    iframe.contentWindow.postMessage({ type }, '*');
  }, []);

  // Wallet actions - these are fire-and-forget, responses come via SDK events
  const signIn = React.useCallback(() => {
    if (!isReady) {
      console.warn('Wallet bridge not ready yet');
      return;
    }
    setIsConnecting(true);
    postMessage('wallet:signIn');
  }, [isReady, postMessage]);

  const signOut = React.useCallback(() => {
    // Clear state immediately, don't wait for SDK event
    setActiveAccount(null);
    if (isReady) {
      postMessage('wallet:signOut');
    }
  }, [isReady, postMessage]);

  const disconnect = React.useCallback(() => {
    // Clear state immediately, don't wait for SDK event
    setActiveAccount(null);
    if (isReady) {
      postMessage('wallet:disconnect');
    }
  }, [isReady, postMessage]);

  /**
   * Sign an unsigned deploy with the connected wallet
   * Returns the signed deploy or error information
   */
  const signDeploy = React.useCallback(async (unsignedDeploy: object): Promise<SignDeployResult> => {
    if (!isReady) {
      return { success: false, error: 'Wallet bridge not ready' };
    }
    if (!activeAccount) {
      return { success: false, error: 'No wallet connected' };
    }

    setIsSigning(true);
    try {
      const result = await sendMessage('wallet:sign', {
        deploy: unsignedDeploy,
        publicKey: activeAccount.publicKey,
      });

      if (!result) {
        return { success: false, cancelled: true };
      }

      const signResult = result as {
        signedDeploy?: object;
        deployHash?: string;
        error?: string;
        cancelled?: boolean;
        accountMismatch?: boolean;
      };

      if (signResult.cancelled) {
        return { success: false, cancelled: true };
      }

      if (signResult.error) {
        return { success: false, error: signResult.error };
      }

      return {
        success: true,
        signedDeploy: signResult.signedDeploy,
        deployHash: signResult.deployHash,
      };
    } catch (error) {
      console.error('[WalletProvider] Sign error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign deploy',
      };
    } finally {
      setIsSigning(false);
    }
  }, [isReady, activeAccount, sendMessage]);

  const value: WalletContextValue = {
    activeAccount,
    isConnecting,
    isConnected: !!activeAccount,
    isReady,
    isSigning,
    signIn,
    signOut,
    disconnect,
    signDeploy,
  };

  return (
    <WalletContext.Provider value={value}>
      {/* Iframe for CSPR.click SDK isolation - visible during connection or signing */}
      <iframe
        ref={iframeRef}
        src="/wallet-bridge.html"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: (isConnecting || isSigning) ? '100vw' : 0,
          height: (isConnecting || isSigning) ? '100vh' : 0,
          border: 'none',
          zIndex: (isConnecting || isSigning) ? 9999 : -1,
          background: (isConnecting || isSigning) ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        }}
        title="Wallet Bridge"
        allow="clipboard-write"
      />
      {children}
    </WalletContext.Provider>
  );
}

// Default wallet state for SSR or when provider is not yet loaded
const defaultWalletState: WalletContextValue = {
  activeAccount: null,
  isConnecting: false,
  isConnected: false,
  isReady: false,
  isSigning: false,
  signIn: () => {},
  signOut: () => {},
  disconnect: () => {},
  signDeploy: async () => ({ success: false, error: 'Wallet not initialized' }),
};

/**
 * Hook to access wallet context
 * Returns default state when not wrapped in WalletProvider (e.g., during SSR)
 */
export function useWallet(): WalletContextValue {
  const context = React.useContext(WalletContext);
  // Return default state during SSR or before provider loads
  if (!context) {
    return defaultWalletState;
  }
  return context;
}

// Export context for advanced use cases
export { WalletContext };

// Type for sign/send operations (for advanced usage)
export interface SignResult {
  signature?: string;
  cancelled?: boolean;
  error?: string;
}

export interface SendResult {
  transactionHash?: string;
  cancelled?: boolean;
  status?: string;
  error?: string;
  errorData?: string;
}
