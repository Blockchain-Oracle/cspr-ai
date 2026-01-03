'use client';

import * as React from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import { cn } from '@/components/utils';
import { Button } from '@/components/shared/Button';
import { MarkdownContent } from './MarkdownContent';
import { ToolResultList, type ToolResultPart } from './ToolResultRenderer';
import type { UnsignedDeployData } from '@/components/blockchain/UnsignedDeployCard';

/**
 * Vercel AI SDK v6 legacy tool invocation part
 * This is the older format with nested toolInvocation object
 */
interface LegacyToolInvocationPart {
  type: 'tool-invocation';
  toolInvocation: {
    state: 'call' | 'partial-call' | 'result';
    step?: number;
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  };
}

/**
 * Vercel AI SDK v6 typed tool part
 * In v6, tool parts are typed as `tool-{toolName}` (e.g., tool-casper_get_balance)
 * with states: input-streaming, input-available, output-available, output-error
 */
interface TypedToolPart {
  type: string; // 'tool-{toolName}' pattern
  toolCallId: string;
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
}

/**
 * Vercel AI SDK v6 dynamic tool part
 * Used for dynamically registered tools (like MCP tools)
 * Type is literally 'dynamic-tool' rather than tool-{name}
 */
interface DynamicToolPart {
  type: 'dynamic-tool';
  toolCallId: string;
  toolName: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
}

/**
 * Text part from v6 SDK
 */
interface TextPart {
  type: 'text';
  text: string;
}

/**
 * Tool invocation from message.toolInvocations array (alternative format)
 */
interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: 'call' | 'partial-call' | 'result';
  args?: Record<string, unknown>;
  result?: unknown;
}

/**
 * Union type for message parts we handle
 */
type MessagePart = TextPart | LegacyToolInvocationPart | TypedToolPart | DynamicToolPart | ToolResultPart | { type: string; [key: string]: unknown };

export interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | React.ReactNode;
  /** Structured message parts for rich rendering (Vercel AI SDK v6 format) */
  parts?: MessagePart[];
  /** Tool invocations array from message object (alternative v6 format) */
  toolInvocations?: ToolInvocation[];
  timestamp?: Date;
  isLoading?: boolean;
  /** @deprecated Use parts prop instead - kept for backwards compatibility */
  toolResults?: React.ReactNode;
  /** Callback when user wants to sign a deploy */
  onSignDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  /** Callback when user wants to cancel a deploy */
  onCancelDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  /** Callback to view deploy in explorer */
  onViewExplorer?: (deployHash: string) => void;
  /** Current network context */
  network?: 'testnet' | 'mainnet';
  /** Map of signed deploy states keyed by deploy hash */
  signedDeploys?: Map<string, { isLoading: boolean; isSigned: boolean; isCancelled?: boolean; deployHash?: string; error?: string; }>;
}

/**
 * MessageBubble - Renders a chat message with markdown support and generative UI
 *
 * Handles:
 * - User messages (plain text)
 * - Assistant messages (markdown rendered)
 * - Tool invocations (rendered as blockchain component cards)
 */
export function MessageBubble({
  role,
  content,
  parts,
  toolInvocations,
  timestamp,
  isLoading = false,
  toolResults,
  onSignDeploy,
  onCancelDeploy,
  onViewExplorer,
  network = 'testnet',
  signedDeploys,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = React.useState(false);

  // Extract text content from parts if available
  const textContent = React.useMemo(() => {
    if (parts && parts.length > 0) {
      return parts
        .filter((p): p is TextPart => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
    }
    return typeof content === 'string' ? content : '';
  }, [parts, content]);

  // Extract tool results from parts or toolInvocations
  // Handles multiple v6 SDK formats:
  // 1. message.toolInvocations array (direct access)
  // 2. parts with 'tool-invocation' type (legacy nested format)
  // 3. parts with typed 'tool-{toolName}' pattern (modern v6 format)
  // 4. parts with 'tool-result' type (explicit result format)
  const toolResultParts = React.useMemo((): ToolResultPart[] => {
    const results: ToolResultPart[] = [];

    // Method 1: Check message.toolInvocations array first (most common in v6)
    if (toolInvocations && toolInvocations.length > 0) {
      for (const invocation of toolInvocations) {
        if (invocation.state === 'result' && invocation.result !== undefined) {
          // Extract structured data from MCP tool output
          // MCP tools return { content: [...], structuredContent: {...} }
          // We want to use structuredContent if available, otherwise fall back to full result
          const rawResult = invocation.result as any;
          const extractedResult = rawResult?.structuredContent !== undefined
            ? rawResult.structuredContent
            : rawResult;

          results.push({
            type: 'tool-result',
            toolCallId: invocation.toolCallId,
            toolName: invocation.toolName,
            result: extractedResult,
            isError: false,
          });
        }
      }
    }

    // Method 2: Check parts array for various formats
    if (parts && parts.length > 0) {
      for (const part of parts) {
        // Format A: Legacy 'tool-invocation' type with nested toolInvocation object
        if (part.type === 'tool-invocation') {
          const legacyPart = part as LegacyToolInvocationPart;
          const invocation = legacyPart.toolInvocation;
          if (invocation.state === 'result' && invocation.result !== undefined) {
            // Extract structured data from MCP tool output
            // MCP tools return { content: [...], structuredContent: {...} }
            // We want to use structuredContent if available, otherwise fall back to full result
            const rawResult = invocation.result as any;
            const extractedResult = rawResult?.structuredContent !== undefined
              ? rawResult.structuredContent
              : rawResult;

            results.push({
              type: 'tool-result',
              toolCallId: invocation.toolCallId,
              toolName: invocation.toolName,
              result: extractedResult,
              isError: false,
            });
          }
        }
        // Format B: Typed 'tool-{toolName}' pattern (e.g., 'tool-casper_get_balance')
        else if (part.type.startsWith('tool-') && part.type !== 'tool-result' && part.type !== 'tool-invocation') {
          const typedPart = part as TypedToolPart;
          // Check for output-available state (has result)
          if (typedPart.state === 'output-available' && typedPart.output !== undefined) {
            // Extract structured data from MCP tool output
            // MCP tools return { content: [...], structuredContent: {...} }
            // We want to use structuredContent if available, otherwise fall back to full output
            const output = typedPart.output as any;
            const extractedResult = output?.structuredContent !== undefined
              ? output.structuredContent
              : output;

            results.push({
              type: 'tool-result',
              toolCallId: typedPart.toolCallId,
              toolName: typedPart.toolName,
              result: extractedResult,
              isError: false,
            });
          }
          // Check for output-error state
          else if (typedPart.state === 'output-error') {
            results.push({
              type: 'tool-result',
              toolCallId: typedPart.toolCallId,
              toolName: typedPart.toolName,
              result: typedPart.errorText || 'Tool execution failed',
              isError: true,
            });
          }
        }
        // Format C: Dynamic tool type (used by MCP tools)
        else if (part.type === 'dynamic-tool') {
          const dynamicPart = part as DynamicToolPart;
          // Check for output-available state (has result)
          if (dynamicPart.state === 'output-available' && dynamicPart.output !== undefined) {
            // Extract structured data from MCP tool output
            // MCP tools return { content: [...], structuredContent: {...} }
            // We want to use structuredContent if available, otherwise fall back to full output
            const output = dynamicPart.output as any;
            const extractedResult = output?.structuredContent !== undefined
              ? output.structuredContent
              : output;

            results.push({
              type: 'tool-result',
              toolCallId: dynamicPart.toolCallId,
              toolName: dynamicPart.toolName,
              result: extractedResult,
              isError: false,
            });
          }
          // Check for output-error state
          else if (dynamicPart.state === 'output-error') {
            results.push({
              type: 'tool-result',
              toolCallId: dynamicPart.toolCallId,
              toolName: dynamicPart.toolName,
              result: dynamicPart.errorText || 'Tool execution failed',
              isError: true,
            });
          }
        }
        // Format D: Direct 'tool-result' type (standard SDK v6 format)
        // Used for persisted/reconstructed messages from database
        else if (part.type === 'tool-result') {
          const resultPart = part as { type: 'tool-result'; toolCallId?: string; toolName?: string; result?: unknown; isError?: boolean };
          if (resultPart.result !== undefined) {
            // Extract structured data from MCP tool output
            // MCP tools return { content: [...], structuredContent: {...} }
            // We want to use structuredContent if available, otherwise fall back to full result
            const rawResult = resultPart.result as any;
            const extractedResult = rawResult?.structuredContent !== undefined
              ? rawResult.structuredContent
              : rawResult;

            results.push({
              type: 'tool-result',
              toolCallId: resultPart.toolCallId || 'unknown',
              toolName: resultPart.toolName || 'unknown',
              result: extractedResult,
              isError: resultPart.isError || false,
            });
          }
        }
        // Format E: Standard SDK v6 'tool-call' type (maps args to output when complete)
        else if (part.type === 'tool-call') {
          const callPart = part as { type: 'tool-call'; toolCallId?: string; toolName?: string; args?: unknown; result?: unknown };
          // If the tool call has a result attached, extract it
          if (callPart.result !== undefined) {
            // Extract structured data from MCP tool output
            // MCP tools return { content: [...], structuredContent: {...} }
            // We want to use structuredContent if available, otherwise fall back to full result
            const rawResult = callPart.result as any;
            const extractedResult = rawResult?.structuredContent !== undefined
              ? rawResult.structuredContent
              : rawResult;

            results.push({
              type: 'tool-result',
              toolCallId: callPart.toolCallId || 'unknown',
              toolName: callPart.toolName || 'unknown',
              result: extractedResult,
              isError: false,
            });
          }
        }
      }
    }

    return results;
  }, [parts, toolInvocations]);

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Don't render system messages
  if (role === 'system') return null;

  // Check if we have any content to display
  const hasTextContent = textContent.trim().length > 0;
  const hasToolResults = toolResultParts.length > 0;
  const hasLegacyToolResults = !!toolResults;

  return (
    <div
      className={cn(
        'flex w-full items-start gap-2 md:gap-3 p-2 md:p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 md:h-8 md:w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-primary/10 text-primary border-primary/20'
        )}
      >
        {isUser ? <User className="h-4 w-4 md:h-5 md:w-5" /> : <Bot className="h-4 w-4 md:h-5 md:w-5" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1.5 max-w-[calc(100%-3rem)] md:max-w-[75%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Header with name and timestamp */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground font-medium">
            {isUser ? 'You' : 'CSPR.AI'}
          </span>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Text Content Bubble (only if there's text content) */}
        {hasTextContent && (
          <div
            className={cn(
              'relative rounded-xl md:rounded-2xl px-3 md:px-5 py-2.5 md:py-3 text-sm shadow-sm break-words overflow-wrap-anywhere leading-relaxed overflow-hidden',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-none whitespace-pre-wrap'
                : 'bg-muted text-foreground rounded-tl-none border border-border/50'
            )}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {/* User messages: plain text, Assistant messages: markdown */}
            {isUser ? (
              textContent
            ) : (
              <MarkdownContent content={textContent} />
            )}

            {/* Copy button for assistant messages */}
            {!isUser && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -bottom-6 right-0 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                onClick={handleCopy}
                title="Copy message"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>
        )}

        {/* Generative UI: Render tool results as blockchain component cards */}
        {hasToolResults && (
          <div className="w-full mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <ToolResultList
              toolResults={toolResultParts}
              onSignDeploy={onSignDeploy}
              onCancelDeploy={onCancelDeploy}
              onViewExplorer={onViewExplorer}
              network={network}
              signedDeploys={signedDeploys}
            />
          </div>
        )}

        {/* Legacy: Render raw toolResults prop if provided (backwards compatibility) */}
        {hasLegacyToolResults && !hasToolResults && (
          <div className="w-full mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {toolResults}
          </div>
        )}
      </div>
    </div>
  );
}
