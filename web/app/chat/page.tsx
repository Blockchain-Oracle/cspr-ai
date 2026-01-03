'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage, type UIMessagePart } from 'ai';
import { useConversation } from '@/hooks/useConversation';
import { useWallet } from '@/hooks/useWallet';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MessageList } from '@/components/chat/MessageList';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { WalletConnectPrompt } from '@/components/chat/WalletConnectPrompt';
import { SuggestedActions } from '@/components/chat/SuggestedActions';
import { Sidebar, type Conversation as SidebarConversation } from '@/components/layout/Sidebar';
import { Button } from '@/components/shared/Button';
import type { UnsignedDeployData } from '@/components/blockchain/UnsignedDeployCard';
import { saveDeployState, getDeployStates } from '@/lib/actions/deployStates';
import { convertToDeployFormat } from '@/lib/casper/transaction-utils';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

// State for tracking signed deploys
interface SignedDeployState {
  isLoading: boolean;
  isSigned: boolean;
  isCancelled?: boolean;
  deployHash?: string;
  error?: string;
}

export default function ChatPage() {
  const { isConnected, activeAccount, signDeploy } = useWallet();
  const [inputValue, setInputValue] = React.useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  // Track signing state per deploy (keyed by unsigned deploy hash)
  const [signedDeploys, setSignedDeploys] = React.useState<Map<string, SignedDeployState>>(new Map());

  // Fetch available tools from MCP server
  const [availableTools, setAvailableTools] = React.useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = React.useState(true);
  const [toolsError, setToolsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTools = async () => {
      try {
        setToolsLoading(true);
        setToolsError(null);

        const response = await fetch('/api/tools');
        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.tools && Array.isArray(data.tools)) {
          setAvailableTools(data.tools);
        }
      } catch (error) {
        setToolsError(error instanceof Error ? error.message : 'Failed to fetch tools');
      } finally {
        setToolsLoading(false);
      }
    };

    fetchTools();
  }, []);

  // Conversation persistence
  const {
    conversationId,
    messages: persistedMessages,
    conversations: dbConversations,
    isLoadingConversation,
    startNewConversation,
    loadConversation,
    deleteCurrentConversation,
    persistMessage,
  } = useConversation({
    walletAddress: activeAccount?.publicKey,
  });

  // Use Vercel AI SDK's useChat with v6 transport API
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    error,
  } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: async ({ message }: { message: UIMessage }) => {
      // Note: Server-side handles persistence now via toUIMessageStreamResponse's onFinish
    },
    onError: (error: Error) => {
      // Error handling - errors are shown in UI via status messages
    },
  });

  // Helper to extract text content from message parts
  function getMessageContent(message: UIMessage): string {
    if (!message.parts) return '';
    return message.parts
      .filter((part: UIMessagePart<any, any>): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part: { type: 'text'; text: string }) => part.text)
      .join('');
  }

  // Check if loading
  const isLoading = status === 'streaming' || status === 'submitted';

  // Helper to restore message parts from database for UI rendering
  // Preserves text and tool results so components can be rendered
  function restoreMessageParts(msg: typeof persistedMessages[0]): any[] {
    if (msg.parts && Array.isArray(msg.parts)) {
      // Keep text parts and completed tool parts for UI rendering
      const validParts = msg.parts.filter((p: any) => {
        // Always keep text parts
        if (p.type === 'text' && typeof p.text === 'string') return true;
        // Keep dynamic-tool results that have output (completed MCP tools)
        if (p.type === 'dynamic-tool' && p.state === 'output-available') return true;
        // Keep explicit tool-result parts
        if (p.type === 'tool-result') return true;
        // Keep typed tool parts (tool-{toolName}) with output
        if (p.type?.startsWith('tool-') && p.type !== 'tool-result' && p.state === 'output-available') return true;
        // Keep tool-invocation parts with result state
        if (p.type === 'tool-invocation' && p.toolInvocation?.state === 'result') return true;
        // Skip incomplete/streaming states
        return false;
      });

      if (validParts.length > 0) {
        return validParts;
      }
    }

    // If no valid parts but we have toolResults, reconstruct tool-result parts
    if (msg.toolResults && Array.isArray(msg.toolResults) && msg.toolResults.length > 0) {
      const reconstructedParts: any[] = [
        { type: 'text' as const, text: msg.content || '' },
        ...msg.toolResults.map((tr: any) => ({
          type: 'tool-result' as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          result: tr.result,
          isError: tr.isError || false,
        })),
      ];
      return reconstructedParts;
    }

    // Fallback to content string
    return [{ type: 'text' as const, text: msg.content || '' }];
  }

  // Sync messages when loading a conversation from database
  React.useEffect(() => {
    if (persistedMessages.length > 0) {
      setMessages(
        persistedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          // Restore full parts including tool results for UI rendering
          parts: restoreMessageParts(msg),
          createdAt: msg.timestamp,
        }))
      );
    }
  }, [persistedMessages, setMessages]);

  // Load deploy states when conversation changes
  React.useEffect(() => {
    if (!conversationId) {
      // Clear deploy states when no conversation
      setSignedDeploys(new Map());
      return;
    }

    // Load deploy states from database
    getDeployStates(conversationId).then((result) => {
      if (result.success && result.deployStates) {
        const statesMap = new Map<string, SignedDeployState>();

        result.deployStates.forEach((state) => {
          statesMap.set(state.deployKey, {
            isLoading: false,
            isSigned: state.status === 'signed',
            isCancelled: state.status === 'cancelled',
            deployHash: state.deployHash || undefined,
          });
        });

        setSignedDeploys(statesMap);
      }
    }).catch((error) => {
      console.error('Failed to load deploy states:', error);
    });
  }, [conversationId]);

  // Convert database conversations to sidebar format
  const sidebarConversations: SidebarConversation[] = React.useMemo(() => {
    return dbConversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      preview: '',
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    }));
  }, [dbConversations]);

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue('');

    // Create a new conversation if we don't have one
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await startNewConversation();
    }

    // Persist user message (use the returned ID, not state which might be stale)
    if (persistMessage && activeConversationId) {
      await persistMessage({
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'user',
        content,
        timestamp: new Date(),
      }).catch(console.error);
    }

    // Send message to AI (v6 API uses { text } format)
    // Pass conversationId in body for server-side persistence
    sendMessage(
      { text: content },
      {
        body: {
          conversationId: activeConversationId,
        },
      }
    );
  };

  const handleNewChat = async () => {
    await startNewConversation();
    setMessages([]);
  };

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
  };

  const handleDeleteConversation = async (id: string) => {
    if (id === conversationId) {
      await deleteCurrentConversation();
      setMessages([]);
    }
  };

  // Network state
  const [network] = React.useState<'testnet' | 'mainnet'>('testnet');

  // Handler for viewing deploys in explorer
  const handleViewExplorer = React.useCallback((deployHash: string) => {
    const explorerUrls = {
      mainnet: 'https://cspr.live/deploy',
      testnet: 'https://testnet.cspr.live/deploy',
    } as const;
    window.open(`${explorerUrls[network]}/${deployHash}`, '_blank');
  }, [network]);

  // State for signing feedback
  const [signingStatus, setSigningStatus] = React.useState<{
    isActive: boolean;
    message?: string;
    type?: 'success' | 'error' | 'info';
  }>({ isActive: false });

  // Handler for signing deploys
  const handleSignDeploy = React.useCallback(async (unsignedDeploy: UnsignedDeployData) => {
    if (!unsignedDeploy.unsigned_deploy) {
      setSigningStatus({
        isActive: true,
        message: 'No deploy data to sign',
        type: 'error',
      });
      setTimeout(() => setSigningStatus({ isActive: false }), 3000);
      return;
    }

    // Generate unique key for this deploy using its hash
    const deploy = unsignedDeploy.unsigned_deploy as any;
    const deployKey = deploy?.hash || JSON.stringify(deploy).substring(0, 64);

    // Set loading state
    setSignedDeploys(prev => new Map(prev).set(deployKey, {
      isLoading: true,
      isSigned: false,
    }));

    setSigningStatus({
      isActive: true,
      message: 'Please approve the transaction in your wallet...',
      type: 'info',
    });

    try {
      // Step 1: Convert Transaction V1 format to Deploy format
      // MCP tools output Transaction V1 but wallet/network need Deploy format
      let deployFormat;
      try {
        deployFormat = convertToDeployFormat(unsignedDeploy.unsigned_deploy);
      } catch (conversionError) {
        const errorMsg = conversionError instanceof Error ? conversionError.message : 'Transaction format conversion failed';
        setSignedDeploys(prev => new Map(prev).set(deployKey, {
          isLoading: false,
          isSigned: false,
          error: errorMsg,
        }));
        setSigningStatus({
          isActive: true,
          message: errorMsg,
          type: 'error',
        });
        setTimeout(() => setSigningStatus({ isActive: false }), 5000);
        return;
      }

      // Step 2: Sign the deploy with wallet
      const result = await signDeploy(deployFormat);

      if (result.success) {
        // Step 3: Submit signed deploy to network
        setSigningStatus({
          isActive: true,
          message: 'Submitting transaction to network...',
          type: 'info',
        });

        try {
          const submitResponse = await fetch('/api/submit-deploy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              signedDeploy: result.signedDeploy,
              network,
            }),
          });

          const submitResult = await submitResponse.json();

          if (submitResult.success) {
            // Update with network-confirmed state
            setSignedDeploys(prev => new Map(prev).set(deployKey, {
              isLoading: false,
              isSigned: true,
              deployHash: submitResult.deployHash,
            }));

            // Persist to database
            if (conversationId) {
              await saveDeployState({
                conversationId,
                deployKey,
                status: 'signed',
                deployHash: submitResult.deployHash,
                network,
              });
            }

            setSigningStatus({
              isActive: true,
              message: `Transaction submitted! Hash: ${submitResult.deployHash.slice(0, 16)}...`,
              type: 'success',
            });
          } else {
            // Network submission failed
            setSignedDeploys(prev => new Map(prev).set(deployKey, {
              isLoading: false,
              isSigned: false,
              error: submitResult.error || 'Failed to submit to network',
            }));

            setSigningStatus({
              isActive: true,
              message: submitResult.error || 'Failed to submit to network',
              type: 'error',
            });
          }
        } catch (submitError) {
          // Network submission error
          setSignedDeploys(prev => new Map(prev).set(deployKey, {
            isLoading: false,
            isSigned: false,
            error: submitError instanceof Error ? submitError.message : 'Network submission failed',
          }));

          setSigningStatus({
            isActive: true,
            message: submitError instanceof Error ? submitError.message : 'Network submission failed',
            type: 'error',
          });
        }
      } else if (result.cancelled) {
        // Clear loading state on cancellation
        setSignedDeploys(prev => {
          const updated = new Map(prev);
          updated.delete(deployKey);
          return updated;
        });

        setSigningStatus({
          isActive: true,
          message: 'Transaction signing was cancelled',
          type: 'info',
        });
      } else {
        // Update with error state
        setSignedDeploys(prev => new Map(prev).set(deployKey, {
          isLoading: false,
          isSigned: false,
          error: result.error || 'Failed to sign transaction',
        }));

        setSigningStatus({
          isActive: true,
          message: result.error || 'Failed to sign transaction',
          type: 'error',
        });
      }
    } catch (error) {
      // Update with error state
      setSignedDeploys(prev => new Map(prev).set(deployKey, {
        isLoading: false,
        isSigned: false,
        error: error instanceof Error ? error.message : 'Signing failed',
      }));

      setSigningStatus({
        isActive: true,
        message: error instanceof Error ? error.message : 'Signing failed',
        type: 'error',
      });
    }

    // Clear status after a delay
    setTimeout(() => setSigningStatus({ isActive: false }), 5000);
  }, [signDeploy, network, conversationId]);

  // Handler for cancelling deploys
  const handleCancelDeploy = React.useCallback(async (unsignedDeploy: UnsignedDeployData) => {
    if (!unsignedDeploy.unsigned_deploy) {
      return;
    }

    // Generate unique key for this deploy
    const deploy = unsignedDeploy.unsigned_deploy as any;
    const deployKey = deploy?.hash || JSON.stringify(deploy).substring(0, 64);

    // Update UI state to show cancelled
    setSignedDeploys(prev => new Map(prev).set(deployKey, {
      isLoading: false,
      isSigned: false,
      isCancelled: true,
    }));

    // Persist cancellation to database
    if (conversationId) {
      await saveDeployState({
        conversationId,
        deployKey,
        status: 'cancelled',
        network,
      });
    }

    setSigningStatus({
      isActive: true,
      message: 'Transaction cancelled',
      type: 'info',
    });

    setTimeout(() => setSigningStatus({ isActive: false }), 3000);
  }, [network, conversationId]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          conversations={sidebarConversations}
          activeConversationId={conversationId || undefined}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] md:hidden">
            <Sidebar
              isCollapsed={false}
              onToggle={() => setIsMobileSidebarOpen(false)}
              onNewChat={() => {
                handleNewChat();
                setIsMobileSidebarOpen(false);
              }}
              onSelectConversation={(id) => {
                handleSelectConversation(id);
                setIsMobileSidebarOpen(false);
              }}
              onDeleteConversation={handleDeleteConversation}
              conversations={sidebarConversations}
              activeConversationId={conversationId || undefined}
            />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center border-b border-border/50 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">CSPR.AI Chat</h1>
        </div>

        <ChatInterface
          isLoading={isLoading || isLoadingConversation}
          inputComponent={
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={isLoading}
              placeholder="Ask CSPR.AI about the blockchain..."
            />
          }
        >
          <MessageList
            isEmpty={messages.length === 0}
            emptyStateComponent={
              !isConnected ? (
                <WalletConnectPrompt className="max-w-lg mx-auto" />
              ) : toolsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading available actions...</div>
                </div>
              ) : toolsError ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-destructive">Failed to load actions: {toolsError}</div>
                </div>
              ) : (
                <SuggestedActions
                  tools={availableTools}
                  onActionClick={(prompt) => {
                    // Populate the input field with the suggested prompt
                    // User can then review, edit, or manually submit
                    setInputValue(prompt);
                  }}
                  userAddress={activeAccount?.publicKey}
                />
              )
            }
          >
            {messages.map((msg: UIMessage) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={getMessageContent(msg)}
                parts={msg.parts as any}
                toolInvocations={(msg as any).toolInvocations}
                timestamp={undefined}
                onSignDeploy={handleSignDeploy}
                onCancelDeploy={handleCancelDeploy}
                onViewExplorer={handleViewExplorer}
                network={network}
                signedDeploys={signedDeploys}
              />
            ))}
            {isLoading && <TypingIndicator />}
          </MessageList>
        </ChatInterface>

        {/* Show error if any */}
        {error && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md">
            {error.message}
          </div>
        )}

        {/* Show signing status */}
        {signingStatus.isActive && signingStatus.message && (
          <div
            className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md shadow-lg z-50 ${
              signingStatus.type === 'success'
                ? 'bg-green-600 text-white'
                : signingStatus.type === 'error'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-blue-600 text-white'
            }`}
          >
            {signingStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
