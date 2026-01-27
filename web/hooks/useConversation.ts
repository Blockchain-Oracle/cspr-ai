'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import {
  createConversation,
  getConversationWithMessages,
  getConversations,
  addMessage,
  deleteConversation,
  generateConversationTitle,
  type Conversation,
  type Message,
} from '@/lib/actions/conversations';
import type { ChatMessage } from '@/lib/types';

export interface UseConversationOptions {
  walletAddress?: string;
}

export interface UseConversationReturn {
  // Current conversation state
  conversationId: string | null;
  messages: ChatMessage[];
  isLoadingConversation: boolean;

  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;

  // Actions
  startNewConversation: () => Promise<string>;
  loadConversation: (id: string) => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  persistMessage: (message: ChatMessage) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

/**
 * Converts a database Message to a ChatMessage for the UI
 */
function dbMessageToChatMessage(msg: Message): ChatMessage {
  // Debug: Log what's coming from the database
  console.log('[dbMessageToChatMessage] DB message:', {
    id: msg.id,
    role: msg.role,
    contentLength: msg.content?.length || 0,
    partsCount: msg.parts?.length || 0,
    partsTypes: (msg.parts as any[])?.map((p) => ({
      type: p?.type,
      state: p?.state,
      hasOutput: !!p?.output,
      hasResult: !!p?.result,
    })),
    toolResultsCount: msg.toolResults?.length || 0,
    toolResultsNames: (msg.toolResults as any[])?.map((tr) => tr?.toolName),
  });

  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    toolResults: msg.toolResults as ChatMessage['toolResults'],
    // Cast through unknown to handle DB JSON format mismatch
    parts: (msg.parts as unknown) as ChatMessage['parts'],
  };
}

export function useConversation(options: UseConversationOptions = {}): UseConversationReturn {
  const { walletAddress } = options;

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Conversation list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Transition for smoother UI during async operations
  const [isPending, startTransition] = useTransition();

  /**
   * Load conversation list
   */
  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const result = await getConversations(walletAddress);
      setConversations(result);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [walletAddress]);

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(async (): Promise<string> => {
    setIsLoadingConversation(true);
    try {
      const conversation = await createConversation({
        walletAddress,
      });
      setConversationId(conversation.id);
      setMessages([]);
      // Refresh the list to include the new conversation
      await refreshConversations();
      return conversation.id;
    } finally {
      setIsLoadingConversation(false);
    }
  }, [walletAddress, refreshConversations]);

  /**
   * Load an existing conversation with its messages
   */
  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingConversation(true);
    try {
      // Pass walletAddress for security verification
      const result = await getConversationWithMessages(id, walletAddress);
      if (result) {
        setConversationId(result.conversation.id);
        setMessages(result.messages.map(dbMessageToChatMessage));
      } else {
        // Conversation not found or access denied, start a new one
        await startNewConversation();
      }
    } finally {
      setIsLoadingConversation(false);
    }
  }, [startNewConversation, walletAddress]);

  /**
   * Delete the current conversation
   */
  const deleteCurrentConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      // Pass walletAddress for security verification
      await deleteConversation(conversationId, walletAddress);
      setConversationId(null);
      setMessages([]);
      await refreshConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error; // Re-throw to allow UI to handle unauthorized deletion
    }
  }, [conversationId, refreshConversations, walletAddress]);

  /**
   * Persist a message to the database
   * Also auto-generates title from first user message
   */
  const persistMessage = useCallback(async (message: ChatMessage) => {
    if (!conversationId) {
      console.warn('No active conversation to persist message');
      return;
    }

    try {
      await addMessage({
        conversationId,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        toolResults: message.toolResults,
        // Cast through unknown to handle format mismatch with DB schema
        parts: message.parts as unknown as Parameters<typeof addMessage>[0]['parts'],
      });

      // Auto-generate title from first user message
      if (message.role === 'user' && messages.length === 0) {
        await generateConversationTitle(conversationId, message.content);
        await refreshConversations();
      }
    } catch (error) {
      console.error('Failed to persist message:', error);
    }
  }, [conversationId, messages.length, refreshConversations]);

  // Load conversations on mount and when wallet changes
  useEffect(() => {
    startTransition(() => {
      refreshConversations();
    });
  }, [refreshConversations]);

  return {
    conversationId,
    messages,
    isLoadingConversation: isLoadingConversation || isPending,
    conversations,
    isLoadingConversations: isLoadingConversations || isPending,
    startNewConversation,
    loadConversation,
    deleteCurrentConversation,
    persistMessage,
    refreshConversations,
  };
}
