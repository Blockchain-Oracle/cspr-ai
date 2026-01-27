'use server';

import { eq, desc, asc } from 'drizzle-orm';
import { db, conversations, messages, type Conversation, type Message } from '@/lib/db';

/**
 * Create a new conversation
 *
 * SECURITY: Requires wallet address to ensure conversations are properly
 * scoped to users and prevent data leakage.
 */
export async function createConversation(params: {
  title?: string;
  walletAddress?: string;
}): Promise<Conversation> {
  // CRITICAL: Require wallet address for conversation creation
  if (!params.walletAddress) {
    throw new Error('Wallet address is required to create a conversation');
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      title: params.title || 'New Conversation',
      walletAddress: params.walletAddress,
    })
    .returning();

  return conversation;
}

/**
 * Get all conversations for a specific wallet, ordered by most recent first
 *
 * SECURITY: Returns empty array if no wallet address is provided to prevent
 * leaking conversations from other users.
 */
export async function getConversations(walletAddress?: string): Promise<Conversation[]> {
  // CRITICAL: Never return all conversations - this would leak data across users
  if (!walletAddress) {
    return [];
  }

  return db.query.conversations.findMany({
    where: eq(conversations.walletAddress, walletAddress),
    orderBy: [desc(conversations.updatedAt)],
  });
}

/**
 * Get a single conversation by ID with its messages
 *
 * SECURITY: Optionally pass walletAddress to verify ownership before returning data.
 * If walletAddress is provided and doesn't match, returns null to prevent unauthorized access.
 */
export async function getConversationWithMessages(
  id: string,
  walletAddress?: string
): Promise<{
  conversation: Conversation;
  messages: Message[];
} | null> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      messages: {
        orderBy: [asc(messages.createdAt)],
      },
    },
  });

  if (!conversation) return null;

  // SECURITY: Verify ownership if wallet address is provided
  if (walletAddress && conversation.walletAddress !== walletAddress) {
    console.warn(`[Security] Blocked access attempt: User ${walletAddress} tried to access conversation ${id} owned by ${conversation.walletAddress}`);
    return null;
  }

  return {
    conversation,
    messages: conversation.messages,
  };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<Conversation | null> {
  const [updated] = await db
    .update(conversations)
    .set({
      title,
      updatedAt: new Date()
    })
    .where(eq(conversations.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a conversation and all its messages (cascade)
 *
 * SECURITY: Optionally pass walletAddress to verify ownership before deletion.
 * If walletAddress is provided and doesn't match, throws an error to prevent unauthorized deletion.
 */
export async function deleteConversation(id: string, walletAddress?: string): Promise<void> {
  // SECURITY: Verify ownership before deletion if wallet address is provided
  if (walletAddress) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.walletAddress !== walletAddress) {
      console.warn(`[Security] Blocked delete attempt: User ${walletAddress} tried to delete conversation ${id} owned by ${conversation.walletAddress}`);
      throw new Error('Unauthorized: Cannot delete conversation owned by another user');
    }
  }

  await db.delete(conversations).where(eq(conversations.id, id));
}

/**
 * Add a message to a conversation
 */
export async function addMessage(params: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
  }>;
  parts?: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}): Promise<Message> {
  // Debug: Log what we're about to save
  console.log('[addMessage] Saving to DB:', {
    conversationId: params.conversationId,
    role: params.role,
    contentLength: params.content?.length || 0,
    partsCount: params.parts?.length || 0,
    partsTypes: params.parts?.map((p) => ({
      type: p?.type,
      state: (p as any)?.state,
      hasOutput: !!(p as any)?.output,
    })),
    toolResultsCount: params.toolResults?.length || 0,
  });

  // Update conversation's updatedAt timestamp
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, params.conversationId));

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      toolResults: params.toolResults || null,
      parts: params.parts || null,
    })
    .returning();

  // Debug: Log what was actually saved
  console.log('[addMessage] Saved message:', {
    id: message.id,
    partsCount: (message.parts as any[])?.length || 0,
    toolResultsCount: (message.toolResults as any[])?.length || 0,
  });

  return message;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
  });
}

/**
 * Auto-generate title from first user message
 */
export async function generateConversationTitle(
  conversationId: string,
  firstMessage: string
): Promise<Conversation | null> {
  // Truncate and clean up the message for a title
  const title = firstMessage
    .slice(0, 50)
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');

  const displayTitle = title.length >= 50 ? `${title}...` : title;

  return updateConversationTitle(conversationId, displayTitle);
}

// Re-export types for use in client code
export type { Conversation, Message } from '@/lib/db';
