import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Conversations table - represents a chat session
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull().default('New Conversation'),
  walletAddress: text('wallet_address'), // Optional - linked wallet if connected
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Messages table - individual chat messages
 */
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'user' | 'assistant'>(),
  content: text('content').notNull(),
  // Store tool results and message parts as JSONB for flexibility
  toolResults: jsonb('tool_results').$type<Array<{
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
  }>>(),
  parts: jsonb('parts').$type<Array<{
    type: string;
    [key: string]: unknown;
  }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relations for type-safe queries
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

/**
 * Deploy States table - tracks deploy signing/cancellation status
 * Persists transaction state across page refreshes
 */
export const deployStates = pgTable('deploy_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  deployKey: text('deploy_key').notNull(), // Hash or unique identifier of the deploy
  status: text('status').notNull().$type<'signed' | 'cancelled'>(),
  deployHash: text('deploy_hash'), // Network-confirmed hash (only for signed deploys)
  network: text('network').notNull().$type<'testnet' | 'mainnet'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const deployStatesRelations = relations(deployStates, ({ one }) => ({
  conversation: one(conversations, {
    fields: [deployStates.conversationId],
    references: [conversations.id],
  }),
}));

// Type exports for use in application code
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type DeployState = typeof deployStates.$inferSelect;
export type NewDeployState = typeof deployStates.$inferInsert;
