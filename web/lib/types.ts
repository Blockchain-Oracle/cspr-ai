/**
 * Shared TypeScript types for CSPR.AI
 *
 * DO NOT MODIFY - Claude manages this file
 *
 * These types align with the Vercel AI SDK message structure
 * and the three-table database schema (chats → messages → parts)
 */

// ============================================================================
// Message Part Types (Vercel AI SDK compatible)
// ============================================================================

/** Text content part */
export interface TextPart {
  type: 'text';
  text: string;
}

/** Tool call part - when AI decides to call a tool */
export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/** Tool result part - after tool execution */
export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

/** Reasoning/thinking part (for models with extended thinking) */
export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  signature?: string;
}

/** Source reference part */
export interface SourcePart {
  type: 'source';
  sourceId: string;
  url?: string;
  title?: string;
}

/** File attachment part */
export interface FilePart {
  type: 'file';
  url?: string;
  mimeType: string;
  data?: Uint8Array;
}

/** Blockchain data part - for structured blockchain responses */
export interface DataPart {
  type: 'data';
  dataType: 'balance' | 'transaction' | 'deploy' | 'nft' | 'proposal' | 'pool' | 'staking' | 'tokens' | 'validators';
  payload: Record<string, unknown>;
}

/** Union of all message part types */
export type MessagePart =
  | TextPart
  | ToolCallPart
  | ToolResultPart
  | ReasoningPart
  | SourcePart
  | FilePart
  | DataPart;

// ============================================================================
// Chat Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  /** Raw text content (for backwards compatibility) */
  content: string;
  /** Structured message parts (Vercel AI SDK compatible) */
  parts?: MessagePart[];
  timestamp: Date;
  /** @deprecated Use parts instead */
  toolCalls?: ToolCall[];
  /** @deprecated Use parts instead */
  toolResults?: ToolResult[];
}

/** Helper to extract text content from a message */
export function getTextContent(message: ChatMessage): string {
  if (message.parts) {
    return message.parts
      .filter((p): p is TextPart => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
  }
  return message.content;
}

/** Helper to extract tool results from a message */
export function getToolResults(message: ChatMessage): ToolResultPart[] {
  if (message.parts) {
    return message.parts.filter((p): p is ToolResultPart => p.type === 'tool-result');
  }
  // Backwards compatibility
  if (message.toolResults) {
    return message.toolResults.map((tr) => ({
      type: 'tool-result' as const,
      toolCallId: tr.toolCallId,
      toolName: tr.toolName,
      result: tr.result,
      isError: tr.isError,
    }));
  }
  return [];
}

/** Helper to extract data parts from a message */
export function getDataParts(message: ChatMessage): DataPart[] {
  if (message.parts) {
    return message.parts.filter((p): p is DataPart => p.type === 'data');
  }
  return [];
}

// ============================================================================
// MCP Tool Types (Legacy - for backwards compatibility)
// ============================================================================

/** @deprecated Use ToolCallPart instead */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** @deprecated Use ToolResultPart instead */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ============================================================================
// Chat State
// ============================================================================

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  tools: MCPTool[];
}

// ============================================================================
// MCP Session
// ============================================================================

export interface MCPSession {
  sessionId: string;
  isConnected: boolean;
  serverInfo: {
    name: string;
    version: string;
  } | null;
}
